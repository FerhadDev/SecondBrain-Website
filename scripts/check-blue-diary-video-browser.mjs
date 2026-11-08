import assert from "node:assert/strict"
import fs from "node:fs/promises"
import { withLocalBrowser } from "./lib/local-browser.mjs"
await withLocalBrowser("public", async ({ origin, send, evaluate, until, delay }) => {
  await send("Page.navigate", { url: origin + "/brain/projects/team/blue-diary" })
  await until(
    "document.readyState==='complete' && window.__featuredVideoGallery && document.querySelector('#diary-gameplay-player')",
  )
  const main = "document.querySelector('#diary-gameplay-player [data-featured-video]')",
    puzzle = "document.querySelector('#diary-puzzle-recording [data-featured-video]')"
  assert.equal(
    await evaluate(
      "document.querySelectorAll('#diary-gameplay-player [data-video-select]').length",
    ),
    3,
  )
  assert.equal(await evaluate("document.querySelectorAll('.blue-diary video').length"), 2)
  assert.equal(await evaluate(main + ".getAttribute('src')"), null)
  assert(
    await evaluate(
      main +
        ".muted && " +
        main +
        ".controls && " +
        main +
        ".playsInline && !" +
        main +
        ".autoplay",
    ),
  )
  assert(
    await evaluate(
      "Array.from(document.querySelectorAll('.video-preview-image img')).every(i=>i.getAttribute('src').includes('/project-media/posters/'))",
    ),
  )
  await evaluate(
    "document.querySelector('#diary-gameplay-player').scrollIntoView();document.querySelector('#diary-gameplay-player [data-video-start]').click()",
  )
  await until(main + ".currentTime > .1 && !" + main + ".paused")
  await evaluate("window.scrollTo(0,document.body.scrollHeight)")
  await until(main + ".paused")
  await evaluate(main + ".scrollIntoView();" + main + ".volume=.35;" + main + ".play()", {
    userGesture: true,
  })
  await until("!" + main + ".paused")
  assert.equal(await evaluate(main + ".volume"), 0.35)
  await evaluate(
    "(()=>{const video=" +
      main +
      ";const original=video.pause.bind(video);video.pause=()=>{window.__primaryPauses=(window.__primaryPauses||0)+1;return original()}})()",
  )
  await evaluate(
    "document.querySelector('#diary-gameplay-player [data-video-select=\"1\"]').click()",
  )
  assert(await evaluate(main + ".paused"))
  assert((await evaluate("window.__primaryPauses")) > 0)
  assert.equal(
    await evaluate(
      "document.querySelector('#diary-gameplay-player [data-video-title]').textContent",
    ),
    "Opening the diary",
  )
  assert.equal(
    await evaluate(
      "document.querySelectorAll('#diary-gameplay-player [aria-pressed=\"true\"]').length",
    ),
    1,
  )
  await evaluate("document.querySelector('#diary-gameplay-player [data-video-start]').click()")
  await until(main + ".currentTime > .1 && !" + main + ".paused")
  await evaluate(
    "document.querySelector('#diary-puzzle-recording').scrollIntoView();document.querySelector('#diary-puzzle-recording [data-video-start]').click()",
  )
  await until(puzzle + ".currentTime >= 44 && !" + puzzle + ".paused")
  assert(await evaluate(main + ".paused"))
  assert.equal(
    await evaluate("Array.from(document.querySelectorAll('video')).filter(v=>!v.paused).length"),
    1,
  )
  await evaluate(
    "document.querySelector('#diary-puzzle-recording [data-video-fullscreen]').click()",
    { userGesture: true },
  )
  await until("document.fullscreenElement !== null")
  assert(await evaluate("document.fullscreenElement === " + puzzle))
  await evaluate("document.exitFullscreen()")
  await evaluate(
    puzzle + ".currentTime = 61.1;" + puzzle + ".dispatchEvent(new Event('timeupdate'))",
  )
  await until(puzzle + ".paused && " + puzzle + ".currentTime < 43")
  await evaluate(
    "document.querySelector('#diary-gameplay-player [data-video-select=\"2\"]').focus();document.querySelector('#diary-gameplay-player [data-video-select=\"2\"]').dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true}))",
  )
  assert.equal(await evaluate("document.activeElement.dataset.videoSelect"), "0")
  assert.equal(
    await evaluate(
      "document.querySelector('#diary-gameplay-player [data-video-title]').textContent",
    ),
    "Blue Diary in motion",
  )
  await fs.mkdir(".quartz/blue-diary-video-preview", { recursive: true })
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
    await evaluate(
      "Promise.all(Array.from(document.images).map(i=>{i.loading='eager';return i.decode().catch(()=>{})}))",
    )
    await evaluate(
      "(async()=>{for(const img of document.images){img.scrollIntoView();await new Promise(r=>setTimeout(r,10))}document.querySelectorAll('[data-video-playlist]').forEach(e=>e.scrollLeft=0);window.scrollTo(0,0);await new Promise(r=>setTimeout(r,100))})()",
    )
    assert.equal(
      await evaluate("document.documentElement.scrollWidth > innerWidth"),
      false,
      name + " page overflow",
    )
    assert(
      await evaluate(
        "Array.from(document.querySelectorAll('.featured-video-stage video')).every(v=>getComputedStyle(v).objectFit==='contain')",
      ),
    )
    const shot = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
    })
    await fs.writeFile(
      ".quartz/blue-diary-video-preview/" + name + ".png",
      Buffer.from(shot.data, "base64"),
    )
    console.log(name + ": featured layout, proportional videos, no page overflow")
  }
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  })
  assert.equal(
    await evaluate("getComputedStyle(document.querySelector('[data-video-stage]')).animationName"),
    "none",
  )
  await evaluate(
    "(()=>{const button=document.querySelector('#diary-gameplay-player [data-video-select=\"1\"]');const item=JSON.parse(button.dataset.videoItem);item.poster='';button.dataset.videoItem=JSON.stringify(item);button.querySelector('.video-preview-image img').outerHTML='<span data-thumbnail-fallback class=video-poster-fallback>Preview unavailable</span>';document.dispatchEvent(new CustomEvent('nav'));button.scrollIntoView()})()",
  )
  await until(
    "document.querySelector('#diary-gameplay-player [data-video-select=\"1\"] img')?.src.startsWith('data:image/jpeg')",
  )
  console.log("Poster fallback generated from the actual video frame.")
  for (const [route, selector] of [
    ["/brain/projects/game-jam/are-you-king-enough", ".kings-court"],
    ["/brain/projects/game-jam/lucid-space", ".project-page"],
    ["/projects", "[data-gallery-card]"],
  ]) {
    await send("Page.navigate", { url: origin + route })
    await until(`document.readyState==='complete' && document.querySelector('${selector}')`)
  }
  await evaluate(
    "Array.from(document.querySelectorAll('[data-gallery-card] h2 a')).find(a=>a.textContent==='Blue Diary').click()",
  )
  await until("document.querySelector('#diary-gameplay-player') !== null")
  await evaluate(
    "document.querySelector('#diary-gameplay-player [data-video-select=\"1\"]').click()",
  )
  assert.equal(
    await evaluate(
      "document.querySelector('#diary-gameplay-player [data-video-title]').textContent",
    ),
    "Opening the diary",
  )
  console.log(
    "Passed: switching pauses previous playback; one primary plays; real fullscreen; keyboard selection; puzzle excerpt bounds; reduced motion; generated posters; other project routes.",
  )
})
