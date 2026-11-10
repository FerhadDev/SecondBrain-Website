import assert from "node:assert/strict"
import fs from "node:fs/promises"
import vm from "node:vm"

// Exercise graph behavior without claiming browser layout verification.
class Element {
  constructor(tag) {
    this.tag = tag
    this.children = []
    this.attrs = {}
    this.listeners = {}
    this.value = ""
  }
  append(...children) {
    this.children.push(...children)
  }
  setAttribute(key, value) {
    this.attrs[key] = String(value)
  }
  replaceChildren() {
    this.children = []
  }
  addEventListener(name, fn) {
    this.listeners[name] = fn
  }
  getBoundingClientRect() {
    return { width: 1000, height: 500 }
  }
  setPointerCapture() {}
}
const svg = new Element("svg"),
  list = new Element("ul"),
  input = new Element("input"),
  select = new Element("select"),
  reset = new Element("button"),
  hint = new Element("p")
const parts = { svg, ul: list, input, select, button: reset, ".graph-hint": hint }
const host = {
  dataset: { index: "./static/contentIndex.json" },
  isConnected: true,
  querySelector: (s) => parts[s],
}
const index = JSON.parse(
  await fs.readFile(process.argv[2] || "public/static/contentIndex.json", "utf8"),
)
const document = {
  querySelectorAll: () => [host],
  createElementNS: (_, tag) => new Element(tag),
  createElement: (tag) => new Element(tag),
  addEventListener() {},
}
const context = {
  window: {},
  document,
  location: { href: "http://localhost:8080/" },
  URL,
  fetch: async () => ({ ok: true, json: async () => index }),
}
vm.runInNewContext(await fs.readFile("quartz/static/portfolio.js", "utf8"), context)
await new Promise((resolve) => setTimeout(resolve, 0))
const noteEntries = Object.entries(index).filter(
  ([slug]) => slug.startsWith("brain/") && !slug.endsWith("/index"),
)
const total = noteEntries.length
const links = () => svg.children.filter((n) => n.tag === "a")
assert.equal(links().length, total, "Actual public notes, no folder or tag nodes")
assert.equal(list.children.length, total, "Accessible note-list fallback")
assert(links().every((n) => n.attrs.href.startsWith("http://localhost:8080/brain/")))
const actualEdges = new Set(
  Object.entries(index).flatMap(([slug, n]) =>
    (n.links ?? [])
      .filter((t) => t !== slug && t.startsWith("brain/"))
      .map((t) => [slug, t].sort().join("|")),
  ),
)
assert.equal(
  svg.children.filter((n) => n.tag === "line").length,
  actualEdges.size,
  "Edges come from real note links",
)
input.value = "lucid"
input.listeners.input()
assert.equal(links().length, 1)
input.value = ""
select.value = "Projects"
select.listeners.change()
assert.equal(
  links().length,
  noteEntries.filter(([slug, note]) => /\/projects\//i.test(slug) || note.tags?.includes("project"))
    .length,
)
for (const [name, pattern] of [
  ["Skills", /\/skills?\//i],
  ["Achievements", /\/achievements?\//i],
]) {
  select.value = name
  select.listeners.change()
  const singular = name.slice(0, -1).toLowerCase()
  assert.equal(
    links().length,
    noteEntries.filter(
      ([slug, note]) =>
        pattern.test(slug) ||
        note.tags?.some((t) => [singular, name.toLowerCase()].includes(t.toLowerCase())),
    ).length,
    name + " shows only actual public notes",
  )
}
reset.listeners.click()
assert.equal(links().length, total)
svg.listeners.wheel({ preventDefault() {}, deltaY: -100 })
assert.notEqual(svg.attrs.viewBox, "0 0 1000 500")
svg.listeners.pointerdown({
  target: { closest: () => null },
  clientX: 100,
  clientY: 100,
  pointerId: 1,
})
const before = svg.attrs.viewBox
svg.listeners.pointermove({ clientX: 200, clientY: 140 })
assert.notEqual(svg.attrs.viewBox, before)
svg.listeners.pointerup()
reset.listeners.click()
assert.equal(svg.attrs.viewBox, "0 0 1000 500")
console.log(
  "Graph interaction checks passed: public nodes, genuine edges, accessible links, search, categories, empty results, zoom, pan, and reset (DOM simulation).",
)
