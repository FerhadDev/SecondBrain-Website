import assert from "node:assert/strict"
import { withLocalBrowser } from "./lib/local-browser.mjs"

await withLocalBrowser("public", async ({ origin, send, evaluate, until, delay }) => {
  const graphIndex = await (await fetch(origin + "/static/contentIndex.json")).json()
  const expectedNotes = Object.keys(graphIndex).filter(
    (s) => s.startsWith("brain/") && !s.endsWith("/index"),
  ).length
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `window.__portfolioErrors=[];
      window.addEventListener('error',e=>{if(e.message)window.__portfolioErrors.push(e.message)});
      window.addEventListener('unhandledrejection',e=>window.__portfolioErrors.push(String(e.reason)));
      const original=console.error;console.error=(...a)=>{window.__portfolioErrors.push(a.map(String).join(' '));original.apply(console,a)};`,
  })
  for (const route of [
    "/",
    "/projects",
    "/graph",
    "/brain/skills",
    "/brain/achievements",
    "/brain/projects/team/blue-diary",
    "/brain/projects/game-jam/are-you-king-enough",
    "/brain/projects/game-jam/tengri",
    "/brain/projects/game-jam/lucid-space",
  ]) {
    await send("Page.navigate", { url: origin + route })
    await until("document.readyState==='complete' && document.querySelector('.center')")
    await delay(400)
    assert.equal(
      await evaluate("document.querySelectorAll('h1').length"),
      1,
      route + " primary heading",
    )
    assert.equal(
      await evaluate("getComputedStyle(document.querySelector('.center')).display"),
      "contents",
    )
    await evaluate(
      "Promise.all(Array.from(document.images).map(i=>{i.loading='eager';return i.decode().catch(()=>false)}))",
    )
    assert.deepEqual(
      await evaluate(
        "Array.from(document.images).filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.getAttribute('src'))",
      ),
      [],
      route + " images",
    )
    for (const width of [1440, 390, 320]) {
      await send("Emulation.setDeviceMetricsOverride", {
        width,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false,
      })
      await delay(100)
      assert.equal(
        await evaluate("document.documentElement.scrollWidth>innerWidth"),
        false,
        route + " overflow at " + width,
      )
    }
    if (route === "/graph")
      await until(`document.querySelectorAll('.brain-graph svg a').length===${expectedNotes}`)
    if (route === "/brain/skills") {
      assert.equal(await evaluate("document.querySelectorAll('article table tbody tr').length"), 6)
      assert.equal(await evaluate("document.querySelectorAll('article table a.internal').length"), 9)
      assert(await evaluate("!!document.querySelector('.page-listing')"))
    }
    if (route === "/brain/achievements") {
      assert(await evaluate("document.querySelector('article').textContent.includes('2026')"))
      assert(await evaluate("!!document.querySelector('.page-listing')"))
    }
    if (route.endsWith("lucid-space"))
      assert.equal(await evaluate("document.querySelector('h1').id"), "lucid-space")
    assert.deepEqual(await evaluate("window.__portfolioErrors"), [], route + " console errors")
  }
  const index = await (await fetch(origin + "/static/contentIndex.json")).json()
  assert(!JSON.stringify(index).includes("github.com/Estefan009/GameJamPlus"))
  assert(JSON.stringify(index).includes("Repository unavailable (HTTP 404)"))

  // Exercise the real installed initializer and renderer, without editing a note.
  await send("Page.navigate", { url: origin + "/projects" })
  await until("document.readyState==='complete' && document.querySelector('.center')")
  await evaluate(
    `(()=>{const p=document.createElement('pre');p.id='mermaid-regression';p.innerHTML='<code class="mermaid">flowchart TD; Start-->End</code><button class="clipboard-button">Copy</button><button class="expand-button">Expand</button>';document.querySelector('.center').append(p);document.dispatchEvent(new Event('nav'))})()`,
  )
  await until("document.querySelectorAll('#mermaid-regression svg .node').length===2")
  await delay(200)
  assert.deepEqual(
    await evaluate("window.__portfolioErrors"),
    [],
    "real Mermaid rendering console errors",
  )
  console.log(
    "Passed: nine routes including authored Skills/Achievements hubs and listings; one H1; preserved anchor; real Mermaid diagram; no console errors/missing images; 320/390px layouts; graph; unavailable repository removed from search index.",
  )
})
