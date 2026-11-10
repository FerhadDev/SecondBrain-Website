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
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1100,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await send("Page.navigate", { url: origin + "/" })
  await until("document.readyState==='complete' && document.querySelector('.project-card')")
  assert.equal(
    await evaluate(
      "Array.from(document.querySelectorAll('.project-card')).find(c=>c.querySelector('h3')?.textContent==='Are You King Enough').querySelector('.card-links a[href*=\"itch.io\"]').textContent.trim()",
    ),
    "Download on itch.io ↗",
  )
  assert.equal(
    await evaluate(
      "document.querySelector('.portfolio-footer a[href=\"https://www.linkedin.com/in/ferhadzamanov/\"]')?.target",
    ),
    "_blank",
  )
  assert(
    await evaluate(
      "document.querySelector('.portfolio-footer a[href*=\"linkedin.com\"]').rel.includes('noopener')",
    ),
  )
  for (const width of [1440, 390, 320]) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 1100,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await delay(100)
    assert.equal(
      await evaluate("document.documentElement.scrollWidth>innerWidth"),
      false,
      "homepage overflow at " + width,
    )
  }
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1100,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await send("Page.navigate", { url: origin + "/projects" })
  await until(
    `document.readyState === 'complete' && document.querySelector('[data-gallery-controls]')?.hidden === false`,
  )
  const projectCount = await evaluate(`document.querySelectorAll('[data-gallery-card]').length`)
  const publicIndex = await (await fetch(origin + "/static/contentIndex.json")).json()
  const expectedProjects = Object.entries(publicIndex).filter(([slug, note]) =>
    slug.startsWith("brain/projects/") && !slug.endsWith("/index") && note.tags?.includes("project"))
  assert.equal(projectCount, expectedProjects.length)
  const titles = await evaluate(
    "Array.from(document.querySelectorAll('[data-gallery-card] h2')).map(n=>n.textContent)",
  )
  assert.deepEqual(
    titles.slice().sort(),
    expectedProjects.map(([, note]) => note.title).sort(),
  )
  await evaluate(
    "Promise.all(Array.from(document.querySelectorAll('[data-gallery-card] img')).map(i=>{i.loading='eager';return i.decode()}))",
  )
  assert(
    await evaluate(
      "Array.from(document.querySelectorAll('[data-gallery-card] img')).every(i=>i.naturalWidth>0)",
    ),
  )
  const visible = `Array.from(document.querySelectorAll('[data-gallery-card]')).filter(c=>!c.hidden)`
  const setSearch = async (query) =>
    evaluate(
      `(()=>{const e=document.querySelector('[data-gallery-search]');e.value=${JSON.stringify(query)};e.dispatchEvent(new Event('input',{bubbles:true}));return true})()`,
    )
  await setSearch("Lucid")
  assert.equal(await evaluate(`${visible}.length`), 1)
  assert((await evaluate(`${visible}[0].textContent`)).includes("Lucid Space"))
  await setSearch("lucid space")
  assert.equal(await evaluate(`${visible}.length`), 1)
  await setSearch("no-such-project-xyz")
  assert.equal(await evaluate(`${visible}.length`), 0)
  assert.equal(await evaluate(`document.querySelector('[data-gallery-empty]').hidden`), false)
  await evaluate(`document.querySelector('[data-gallery-reset]').click()`)
  assert.equal(await evaluate(`${visible}.length`), projectCount)
  assert.equal(
    await evaluate(`document.activeElement === document.querySelector('[data-gallery-search]')`),
    true,
  )
  await evaluate(
    "(()=>{const s=document.querySelector('[data-gallery-category]');s.value='Team';s.dispatchEvent(new Event('change',{bubbles:true}))})()",
  )
  assert((await evaluate(`${visible}.length`)) >= 1)
  await setSearch("Blue Diary")
  assert.equal(await evaluate(`${visible}.length`), 1)
  for (const label of ["Team Project", "Adventure / Puzzle", "Unity", "Discontinued"])
    assert((await evaluate(`${visible}[0].textContent`)).includes(label))
  await setSearch("Lucid")
  assert.equal(await evaluate(`${visible}.length`), 0)
  await setSearch("Blue Diary")
  assert.equal(await evaluate(`${visible}.length`), 1)
  await evaluate("document.querySelector('[data-gallery-reset]').click()")
  await fs.mkdir(".quartz/gallery-preview", { recursive: true })
  for (const [name, width, columns] of [
    ["desktop", 1440, 3],
    ["tablet", 900, 2],
    ["mobile", 390, 1],
    ["small-mobile", 320, 1],
  ]) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 1100,
      deviceScaleFactor: 1,
      mobile: false,
    })
    const layout = await evaluate(
      `(()=>({columns:getComputedStyle(document.querySelector('.showcase-grid')).gridTemplateColumns.split(' ').length,overflow:document.documentElement.scrollWidth > innerWidth}))()`,
    )
    assert.equal(layout.columns, columns, `${name} column count`)
    assert.equal(layout.overflow, false, `${name} horizontal overflow`)
    const shot = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
    })
    await fs.writeFile(`.quartz/gallery-preview/${name}.png`, Buffer.from(shot.data, "base64"))
    console.log(`${name}: ${columns} columns, no horizontal overflow`)
  }
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1100,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await evaluate(
    `Array.from(document.querySelectorAll('[data-gallery-card] h2 a')).find(a=>a.textContent==='Blue Diary').click()`,
  )
  await until(
    `location.pathname === '/brain/projects/team/blue-diary' && document.querySelector('.blue-diary')`,
  )
  await evaluate(
    `Array.from(document.querySelectorAll('nav a')).find(a=>a.textContent==='Projects').click()`,
  )
  await until(
    `location.pathname === '/projects' && document.querySelector('[data-gallery-controls]')?.hidden === false`,
  )
  await setSearch("Lucid")
  assert.equal(await evaluate(`${visible}.length`), 1, "Gallery works after SPA navigation")
  await evaluate(`document.querySelector('.search-button').click()`)
  await until(`document.querySelector('.search-container.active') !== null`)
  await evaluate(
    `(()=>{const input=document.querySelector('.search-space input');input.value='Blue Diary';input.dispatchEvent(new Event('input',{bubbles:true}))})()`,
  )
  await until(
    `Array.from(document.querySelectorAll('.result-card')).some(n=>n.textContent.includes('Blue Diary'))`,
  )
  await send("Page.navigate", { url: origin + "/graph" })
  const graphIndex = await (await fetch(origin + "/static/contentIndex.json")).json()
  const expectedNotes = Object.keys(graphIndex).filter(
    (s) => s.startsWith("brain/") && !s.endsWith("/index"),
  ).length
  await until(`document.querySelectorAll('.brain-graph svg a').length === ${expectedNotes}`)
  console.log(
    "Browser checks passed: current projects, search, category/combined filters, empty state, reset/focus, responsive layouts, SPA links, native search, and graph.",
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
