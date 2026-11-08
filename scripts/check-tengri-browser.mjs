import assert from "node:assert/strict"
import fs from "node:fs/promises"
import { withLocalBrowser } from "./lib/local-browser.mjs"

await withLocalBrowser("public", async ({ origin, send, evaluate, until }) => {
  await send("Page.navigate", { url: origin + "/projects" })
  await until("document.querySelector('[data-gallery-controls]')?.hidden === false")
  const visible =
    "Array.from(document.querySelectorAll('[data-gallery-card]')).filter(c=>!c.hidden)"
  await evaluate(
    `(()=>{const s=document.querySelector('[data-gallery-search]');s.value='Tengri';s.dispatchEvent(new Event('input',{bubbles:true}))})()`,
  )
  assert.equal(await evaluate(`${visible}.length`), 1)
  assert((await evaluate(`${visible}[0].textContent`)).includes("Tengri"))
  assert.equal(await evaluate(`${visible}[0].dataset.category`), "Game Jam")
  await evaluate(
    `(()=>{const s=document.querySelector('[data-gallery-category]');s.value='Team';s.dispatchEvent(new Event('change',{bubbles:true}))})()`,
  )
  assert.equal(await evaluate(`${visible}.length`), 0)
  await evaluate(
    `(()=>{const s=document.querySelector('[data-gallery-category]');s.value='Game Jam';s.dispatchEvent(new Event('change',{bubbles:true}))})()`,
  )
  assert.equal(await evaluate(`${visible}.length`), 1)
  await evaluate(
    `Promise.all(${visible}.flatMap(c=>Array.from(c.querySelectorAll('img'))).map(i=>{i.loading='eager';return i.decode()}))`,
  )
  assert(await evaluate(`${visible}[0].querySelector('img').naturalWidth > 0`))
  await evaluate(`${visible}[0].querySelector('h2 a').click()`)
  await until("!!document.querySelector('.tengri')")
  await evaluate(
    "Promise.all(Array.from(document.querySelectorAll('.tengri img')).map(i=>{i.loading='eager';return i.decode()}))",
  )
  assert.equal(await evaluate("document.querySelectorAll('.tengri-gallery img').length"), 5)
  assert(
    await evaluate(
      "Array.from(document.querySelectorAll('.tengri-gallery img')).every(i=>i.getBoundingClientRect().height>50)",
    ),
    "Gallery images retain visible height below the fold",
  )
  assert(
    await evaluate(
      "Array.from(document.querySelectorAll('.tengri img')).every(i=>i.naturalWidth>0)",
    ),
  )
  assert(
    await evaluate("document.querySelector('.tengri-prose table')?.textContent.includes('Fight')"),
  )
  for (const target of [
    "/brain/about-me",
    "/brain/projects/game-jam/are-you-king-enough",
    "/brain/projects/game-jam/lucid-space",
  ])
    assert(
      await evaluate(
        `Array.from(document.querySelectorAll('.tengri a')).some(a=>a.pathname===${JSON.stringify(target)})`,
      ),
    )
  assert(
    await evaluate("!!document.querySelector('.tengri a[href=\"https://youtu.be/4xvRr4dMs78\"]')"),
  )
  await fs.mkdir(".quartz/tengri-preview", { recursive: true })
  for (const width of [1440, 390, 320]) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    })
    assert.equal(
      await evaluate("document.documentElement.scrollWidth > innerWidth"),
      false,
      `${width}px horizontal overflow`,
    )
    const shot = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
    })
    await fs.writeFile(`.quartz/tengri-preview/${width}.png`, Buffer.from(shot.data, "base64"))
  }
  const index = await (await fetch(origin + "/static/contentIndex.json")).json()
  assert(
    Object.keys(index).some((k) => k.endsWith("/tengri")),
    "Tengri is indexed for search and graph",
  )
  for (const [route, selector] of [
    ["/brain/projects/team/blue-diary", ".blue-diary"],
    ["/brain/projects/game-jam/are-you-king-enough", ".kings-court"],
    ["/graph", ".brain-graph svg"],
  ]) {
    await send("Page.navigate", { url: origin + route })
    await until(`!!document.querySelector(${JSON.stringify(selector)})`)
  }
  console.log(
    "Tengri: gallery search/category filters, cover, custom route, five decoded images, source table/public links, desktop/mobile layout, search/graph index and existing themes passed.",
  )
})
