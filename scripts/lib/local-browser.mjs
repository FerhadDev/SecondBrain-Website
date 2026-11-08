import fs from "node:fs/promises"
import path from "node:path"
import os from "node:os"
import http from "node:http"
import { spawn } from "node:child_process"
import serve from "serve-handler"

export async function withLocalBrowser(directory, run) {
  let executable
  for (const candidate of [
    process.env.GALLERY_BROWSER,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  ].filter(Boolean)) {
    try {
      await fs.access(candidate)
      executable = candidate
      break
    } catch {}
  }
  if (!executable)
    throw Error("Installed Chromium not available; use a supplied poster or GALLERY_BROWSER.")
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), "quartz-project-media-"))
  const server = http.createServer((req, res) =>
    serve(req, res, { public: directory, cleanUrls: true }),
  )
  await new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", resolve)
  })
  const origin = `http://127.0.0.1:${server.address().port}`
  const browser = spawn(
    executable,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-background-networking",
      "--disable-component-update",
      "--disable-sync",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    { windowsHide: true, stdio: "ignore" },
  )
  let socket, spawnError, closeBrowser
  browser.on("error", (e) => {
    spawnError = e
  })
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  try {
    let port
    for (let i = 0; i < 100; i++) {
      if (spawnError) throw spawnError
      try {
        port = Number(
          (await fs.readFile(path.join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0],
        )
        break
      } catch {}
      await delay(100)
    }
    if (!port) throw Error("Browser did not start")
    const target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, {
      method: "PUT",
    }).then((r) => r.json())
    socket = new WebSocket(target.webSocketDebuggerUrl)
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true })
      socket.addEventListener("error", reject, { once: true })
    })
    let id = 0
    const pending = new Map()
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data),
        request = pending.get(message.id)
      if (request) {
        pending.delete(message.id)
        clearTimeout(request.timeout)
        message.error
          ? request.reject(Error(JSON.stringify(message.error)))
          : request.resolve(message.result)
      }
    })
    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const key = ++id,
          timeout = setTimeout(() => {
            pending.delete(key)
            reject(Error("Browser timeout: " + method))
          }, 30000)
        pending.set(key, { resolve, reject, timeout })
        socket.send(JSON.stringify({ id: key, method, params }))
      })
    closeBrowser = () => send("Browser.close")
    const evaluate = async (expression, { userGesture = false } = {}) => {
      const result = await send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
        userGesture,
      })
      if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails))
      return result.result.value
    }
    const until = async (expression) => {
      for (let i = 0; i < 100; i++) {
        if (await evaluate(expression)) return
        await delay(100)
      }
      throw Error("Browser condition timed out: " + expression)
    }
    await send("Page.enable")
    await send("Runtime.enable")
    await send("Network.enable")
    await send("Network.setBlockedURLs", {
      urls: ["*fonts.googleapis.com*", "*fonts.gstatic.com*"],
    })
    return await run({ origin, send, evaluate, until, delay })
  } finally {
    if (socket?.readyState === 1) {
      try {
        await closeBrowser?.()
      } catch {}
      socket.close()
    }
    browser.kill()
    server.closeAllConnections()
    server.close()
    const resolved = path.resolve(profile),
      temporary = path.resolve(os.tmpdir()) + path.sep
    if (
      !resolved.startsWith(temporary) ||
      !path.basename(resolved).startsWith("quartz-project-media-")
    )
      throw Error("Unsafe temporary browser path")
    try {
      await fs.rm(resolved, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 })
    } catch {}
  }
}
