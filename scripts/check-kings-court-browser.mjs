import assert from "node:assert/strict"
import fs from "node:fs/promises"
import http from "node:http"
import path from "node:path"
import os from "node:os"
import { spawn } from "node:child_process"
import handler from "serve-handler"

const candidates = [
  process.env.GALLERY_BROWSER,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].filter(Boolean)
let executable
for (const candidate of candidates) {
  try {
    await fs.access(candidate)
    executable = candidate
    break
  } catch {}
}
if (!executable)
  throw new Error("No installed Chromium browser found; set GALLERY_BROWSER to its executable.")
const profile = await fs.mkdtemp(path.join(os.tmpdir(), "quartz-gallery-browser-"))
const server = http.createServer((req, res) =>
  handler(req, res, { public: "public", cleanUrls: true }),
)
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
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
let spawnError
browser.on("error", (error) => (spawnError = error))
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
let socket, send
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
  assert(port, "Headless browser did not start its debugging endpoint")
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
    const message = JSON.parse(event.data)
    const request = pending.get(message.id)
    if (request) {
      pending.delete(message.id)
      clearTimeout(request.timeout)
      message.error
        ? request.reject(new Error(JSON.stringify(message.error)))
        : request.resolve(message.result)
    }
  })
  send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const key = ++id,
        timeout = setTimeout(() => {
          pending.delete(key)
          reject(new Error(`CDP timeout: ${method}`))
        }, 12000)
      pending.set(key, { resolve, reject, timeout })
      socket.send(JSON.stringify({ id: key, method, params }))
    })
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  const until = async (expression) => {
    for (let i = 0; i < 100; i++) {
      if (await evaluate(expression)) return
      await delay(100)
    }
    throw Error(`Browser condition timed out: ${expression}`)
  }
  await send("Page.enable")
  await send("Runtime.enable")
  await send("Network.enable")
  await send("Network.setBlockedURLs", { urls: ["*fonts.googleapis.com*", "*fonts.gstatic.com*"] })
  await send("Page.navigate", { url: origin + "/projects" })
  await until("document.querySelector('[data-gallery-controls]')?.hidden === false")
  await evaluate(
    "Array.from(document.querySelectorAll('[data-gallery-card] h2 a')).find(a=>a.textContent==='Are You King Enough').click()",
  )
  await until(
    "location.pathname === '/brain/projects/game-jam/are-you-king-enough' && document.querySelector('.kings-court')",
  )
  await evaluate(
    "Promise.all(Array.from(document.querySelectorAll('.kings-court img')).map(i=>{i.loading='eager';return i.decode()}))",
  )
  assert.equal(await evaluate("document.querySelectorAll('h1').length"), 1)
  assert.equal(
    await evaluate("document.querySelectorAll('.court-contributions article').length"),
    5,
  )
  assert.equal(
    await evaluate("document.querySelectorAll('#court-gallery .court-gallery-item').length"),
    6,
  )
  assert.equal(await evaluate("document.querySelectorAll('.court-media-pending').length"), 0)
  assert.equal(await evaluate("document.querySelectorAll('.project-metadata').length"), 0)
  assert.equal(
    await evaluate("document.querySelector('.court-play').href"),
    "https://farhaddev.itch.io/are-you-king-enough",
  )
  for (const value of [
    "48 hours",
    "DOTween",
    "ScriptableObjects",
    "6000.3.6f1",
    "Team leader and game developer",
    "stopped",
  ])
    assert((await evaluate("document.body.textContent")).includes(value))
  assert(
    !(await evaluate("document.querySelector('.court-contributions').textContent")).includes(
      "independently verified",
    ),
  )
  assert(
    (await evaluate("document.querySelector('.court-record').textContent")).includes(
      "Tool / library",
    ),
  )
  await fs.mkdir(".quartz/kings-court-preview", { recursive: true })
  for (const [name, width] of [
    ["desktop", 1440],
    ["tablet", 900],
    ["mobile", 390],
    ["small-mobile", 320],
  ]) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    })
    assert.equal(
      await evaluate("document.documentElement.scrollWidth > innerWidth"),
      false,
      name + " overflow",
    )
    assert(
      await evaluate(
        "Array.from(document.querySelectorAll('.kings-court img')).every(i=>i.naturalWidth>0 && getComputedStyle(i).objectFit==='contain')",
      ),
    )
    await evaluate(
      "(async()=>{for(const img of document.querySelectorAll('.kings-court img')) { img.scrollIntoView(); await new Promise(r=>setTimeout(r,30)); } window.scrollTo(0,0); await new Promise(r=>setTimeout(r,100));})()",
    )
    const shot = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
    })
    await fs.writeFile(
      ".quartz/kings-court-preview/" + name + ".png",
      Buffer.from(shot.data, "base64"),
    )
    console.log(name + ": title/characters preserved, images loaded, no overflow")
  }
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  })
  assert.equal(
    await evaluate(
      "getComputedStyle(document.querySelector('.court-act-shadow'),'::before').animationName",
    ),
    "none",
  )
  await evaluate("document.querySelector('#court-characters summary').click()")
  assert.equal(await evaluate("document.querySelector('#court-characters details').open"), true)
  await evaluate("document.querySelector('.court-chapters a').click()")
  assert.equal(await evaluate("location.hash"), "#court-overview")
  await send("Page.navigate", { url: origin + "/brain/projects/team/blue-diary" })
  await until("document.querySelector('.blue-diary') && document.readyState==='complete'")
  assert.equal(await evaluate("document.querySelector('.kings-court-shell')===null"), true)
  await send("Page.navigate", { url: origin + "/brain/projects/game-jam/lucid-space" })
  await until("document.querySelector('.project-page') && document.readyState==='complete'")
  assert.equal(await evaluate("document.querySelector('.kings-court-shell')===null"), true)
  console.log(
    "Court checks passed: gallery navigation, documented contributions, approved artwork, responsive layouts, reduced motion, full-size viewing, Blue Diary and Lucid Space.",
  )
} finally {
  if (socket?.readyState === 1) {
    try {
      await send("Browser.close")
    } catch {}
    socket.close()
  }
  browser.kill()
  server.closeAllConnections()
  server.close()
  // Only remove the exact test profile created under the system temporary directory.
  const resolved = path.resolve(profile),
    temporary = path.resolve(os.tmpdir()) + path.sep
  assert(
    resolved.startsWith(temporary) && path.basename(resolved).startsWith("quartz-gallery-browser-"),
  )
  try {
    await fs.rm(resolved, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 })
  } catch {}
}
