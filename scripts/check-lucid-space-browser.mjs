import assert from "node:assert/strict"
import fs from "node:fs/promises"
import { withLocalBrowser } from "./lib/local-browser.mjs"

await withLocalBrowser("public", async ({ origin, send, evaluate, until, delay }) => {
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `window.lucidErrors=[];
      addEventListener('error',e=>lucidErrors.push(e.message));
      addEventListener('unhandledrejection',e=>lucidErrors.push(String(e.reason)));`,
  })
  await send("Page.navigate", { url: origin + "/brain/projects/game-jam/lucid-space" })
  await until("document.readyState==='complete' && document.querySelector('.lucid-space')")
  assert.equal(await evaluate("document.querySelectorAll('h1').length"), 1)
  assert(await evaluate("document.querySelector('.lucid-intro').textContent.includes('Trojan Horse Studios')"))
  assert(await evaluate("document.querySelector('#lucid-my-contributions').textContent.includes('Role: Game Developer')"))
  assert(await evaluate("document.querySelector('#lucid-my-contributions').textContent.includes('have not yet been documented')"))
  assert.equal(await evaluate("document.querySelector('.lucid-credits').textContent.includes('Studio attribution needs owner confirmation')"), false)
  assert.equal(await evaluate("document.querySelectorAll('.lucid-space img').length"), 4)
  assert.equal(await evaluate("document.querySelectorAll('.lucid-space video').length"), 1)
  assert(await evaluate("document.querySelector('#lucid-music-disc-abilities').textContent.includes('music discs')"))
  await evaluate("Promise.all(Array.from(document.querySelectorAll('.lucid-space img')).map(i=>{i.loading='eager';return i.decode()}))")
  const cover = await evaluate("document.querySelector('.lucid-title-art img').src")
  assert(cover.includes("20261115112549"), "Real title-screen cover")
  assert.equal(await evaluate("document.querySelector('video').poster"), cover)
  assert(await evaluate("document.querySelector('video').controls && document.querySelector('video').playsInline && !document.querySelector('video').autoplay"))
  for (const width of [1440, 390, 320]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 950, deviceScaleFactor: 1, mobile: false })
    await delay(100)
    assert.equal(await evaluate("document.documentElement.scrollWidth>innerWidth"), false, "Overflow at " + width)
    assert(await evaluate(`Array.from(document.querySelectorAll('.lucid-space img')).every(i=>{
      const r=i.getBoundingClientRect();return i.naturalWidth>0&&Math.abs(r.width/r.height-i.naturalWidth/i.naturalHeight)<.03
    })`), "Uncropped screenshots at " + width)
    await evaluate("window.scrollTo({top:0,behavior:'instant'})")
    const screenshot = await send("Page.captureScreenshot", { format: "png" })
    await fs.mkdir(".quartz/lucid-preview", { recursive: true })
    await fs.writeFile(`.quartz/lucid-preview/${width}.png`, Buffer.from(screenshot.data, "base64"))
  }
  for (const href of await evaluate("Array.from(document.querySelectorAll('.lucid-space a[href^=\"#\"]')).map(a=>a.getAttribute('href').slice(1))"))
    assert(await evaluate(`!!document.getElementById(${JSON.stringify(href)})`), "Section anchor " + href)
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 })
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 })
  await evaluate("document.querySelector('.lucid-gallery a').focus()")
  assert(await evaluate("document.activeElement.matches(':focus-visible')"))
  const video = "document.querySelector('.lucid-space video')"
  await evaluate(video + ".scrollIntoView({behavior:'instant'});" + video + ".play()", { userGesture: true })
  await until(video + ".currentTime>0 && !" + video + ".paused")
  assert(await evaluate(video + ".videoWidth>0 && !" + video + ".error"))
  await send("Page.bringToFront")
  await send("Emulation.clearDeviceMetricsOverride")
  await evaluate(video + ".requestFullscreen()", { userGesture: true })
  await until("document.fullscreenElement===document.querySelector('.lucid-space video')")
  await evaluate("document.exitFullscreen()")
  await evaluate(video + ".pause()")
  assert.deepEqual(await evaluate("window.lucidErrors"), [])
  await send("Page.navigate", { url: origin + "/" })
  await until("!!document.querySelector('.project-card')")
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('.project-card')).find(c=>c.querySelector('h3')?.textContent==='Lucid Space').querySelector('img').src`), cover)
  console.log("Passed: Lucid title + three gameplay screenshots, real cover on homepage, no image crop/overflow at 1440/390/320px, section links/focus, native video playback/fullscreen/poster, no browser errors.")
})
