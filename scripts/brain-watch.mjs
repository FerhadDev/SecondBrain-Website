import path from "node:path"
import { fileURLToPath } from "node:url"
import chokidar from "chokidar"
import { createServer } from "node:http"
import serve from "serve-handler"
import { approved, assets, forbidden, noLinks } from "./sync-obsidian.mjs"
import { pipeline, retryLocked } from "./brain-pipeline.mjs"

export function createQueue(
  work,
  { debounce = 600, error = (e) => console.error(e.message) } = {},
) {
  let timer,
    running,
    pending = false,
    stopped = false
  const start = async () => {
    timer = undefined
    if (running || stopped) return
    pending = false
    running = Promise.resolve().then(work).catch(error)
    await running
    running = undefined
    if (pending && !stopped && !timer) timer = setTimeout(start, debounce)
  }
  return {
    request() {
      if (stopped) return
      pending = true
      clearTimeout(timer)
      timer = setTimeout(start, debounce)
    },
    async close() {
      stopped = true
      clearTimeout(timer)
      await running
    },
  }
}

export async function startWatcher({
  preview = false,
  source = approved,
  update,
  debounce = 600,
} = {}) {
  await noLinks(source)
  const controller = new AbortController()
  let server,
    stopping = false
  const queue = createQueue(
    async () => {
      if (update) await update(controller.signal)
      else await retryLocked(() => pipeline({ signal: controller.signal }))
      if (preview && !server) {
        server = createServer((req, res) => serve(req, res, { public: "public", cleanUrls: true }))
        server.listen(8080, "127.0.0.1", () =>
          console.log("Preview: http://localhost:8080/projects"),
        )
      }
    },
    {
      debounce,
      error: (e) => {
        if (!stopping) {
          console.error(`Public update failed; last valid preview retained. ${e.message}`)
          if (e.code === "EBUSY") queue.request()
        }
      },
    },
  )
  const watcher = chokidar.watch(source, {
    ignoreInitial: true,
    followSymlinks: false,
    atomic: true,
    awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 150 },
    ignored: (p) => forbidden(path.relative(source, p)),
  })
  const ready = new Promise((resolve) => watcher.once("ready", resolve))
  watcher.on("all", (event, p) => {
    if (
      ["addDir", "unlinkDir"].includes(event) ||
      /\.md$/i.test(p) ||
      assets.has(path.extname(p).toLowerCase())
    )
      queue.request()
  })
  watcher.on("ready", () => {
    console.log("Watching approved Public content; Ctrl+C stops. Publishing is manual.")
    queue.request()
  })
  watcher.on("error", (e) => console.error(`Watcher error: ${e.message}`))
  const close = async () => {
    if (stopping) return
    stopping = true
    controller.abort()
    await watcher.close()
    await queue.close()
    if (server) await new Promise((resolve) => server.close(resolve))
    process.off("SIGINT", close)
    process.off("SIGTERM", close)
    console.log("Public watcher stopped.")
  }
  process.on("SIGINT", close)
  process.on("SIGTERM", close)
  return { close, ready }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await startWatcher()
