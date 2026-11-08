import chokidar from "chokidar"
import { spawn } from "node:child_process"
import { createServer } from "node:http"
import serve from "serve-handler"
import { sync } from "./sync-obsidian.mjs"
import { validateDirectory } from "./project-schema.mjs"
const source = "D:\\SecondBrain\\Public"
let running = false,
  pending = false,
  timer,
  server
async function rebuild() {
  if (running) {
    pending = true
    return
  }
  running = true
  try {
    await sync()
    for (const item of await validateDirectory("content/brain"))
      for (const issue of item.issues) console.log(`${item.file}: ${issue}`)
    await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ["quartz/bootstrap-cli.mjs", "build"], {
        stdio: "inherit",
        windowsHide: true,
      })
      child.on("error", reject)
      child.on("exit", (code) =>
        code === 0 ? resolve() : reject(new Error(`Build exited ${code}`)),
      )
    })
    if (!server) {
      server = createServer((req, res) => serve(req, res, { public: "public", cleanUrls: true }))
      server.listen(8080, "127.0.0.1", () =>
        console.log("Preview: http://localhost:8080/projects (refresh after updates)"),
      )
    }
  } catch (e) {
    console.error(e.message)
  } finally {
    running = false
    if (pending) {
      pending = false
      await rebuild()
    }
  }
}
const watcher = chokidar.watch(source, {
  ignoreInitial: true,
  followSymlinks: false,
  ignored: (p) => /(?:^|[\\/])(?:private|templates|\.[^\\/]+)(?:[\\/]|$)/i.test(p),
})
watcher.on("all", () => {
  clearTimeout(timer)
  timer = setTimeout(rebuild, 500)
})
await rebuild()
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    clearTimeout(timer)
    await watcher.close()
    server?.close()
    process.exit()
  })
