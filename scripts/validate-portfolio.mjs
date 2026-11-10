import fs from "node:fs/promises"
import path from "node:path"
import assert from "node:assert/strict"
import { fromHtml } from "hast-util-from-html"
import { visit } from "unist-util-visit"
import { parse } from "yaml"

const config = parse(await fs.readFile("quartz.config.yaml", "utf8"))
const sitePath = new URL(`https://${config.configuration.baseUrl}`).pathname.replace(/\/$/, "")

const outputRoot = process.argv[2] || "public"
const read = (file) => fs.readFile(path.join(outputRoot, file), "utf8")
const index = JSON.parse(await read("static/contentIndex.json"))
const tree = fromHtml(await read("index.html"))
const elements = []
visit(tree, "element", (node) => {
  elements.push(node)
})
const hasClass = (n, c) => n.properties?.className?.includes(c)
assert.equal(
  elements.filter((n) => hasClass(n, "project-card")).length,
  (await read("projects.html")).match(/data-gallery-card/g)?.length ?? 0,
  "Homepage matches the discovered gallery",
)
const publicKind = (kind) => Object.entries(index).filter(([slug, note]) =>
  slug.startsWith("brain/") && !slug.endsWith("/index") && note.tags?.includes(kind))
const skillLinks = []
visit(elements.find((n) => hasClass(n, "home-skill-links")), "element", (node) => {
  if (node.tagName === "a") skillLinks.push(new URL(node.properties.href, "https://portfolio.invalid/").pathname.slice(1))
})
assert.deepEqual(skillLinks.sort(), publicKind("skill").map(([slug]) => slug).sort(), "Skills link to real public notes")
assert.equal(elements.filter((n) => hasClass(n, "home-achievement-card")).length,
  Math.min(3, publicKind("achievement").length), "Only real public achievements")
assert(elements.some((n) => n.properties?.id === "contact"), "Homepage contact section")
assert.equal(elements.filter((n) => n.tagName === "h1").length, 1, "One homepage heading")
assert(
  elements.some((n) => hasClass(n, "search-button")),
  "Quartz search remains available",
)
assert(elements.some((n) => n.properties?.id === "skills"))
for (const slug of [
  "brain/projects/game-jam/are-you-king-enough",
  "brain/projects/game-jam/lucid-space",
]) {
  if (!index[slug]) continue // Deleted public projects must not become required ghost pages.
  const html = await read(slug + ".html")
  if (slug.endsWith("are-you-king-enough")) {
    assert(html.includes('class="kings-court"'))
    assert(html.includes('id="court-work"'))
  } else {
    assert(html.includes('class="project-metadata"'))
    assert(html.includes('class="article-navigation"'))
  }
  assert(!html.includes('class="note-properties"'))
}
const graph = await read("graph.html")
assert(graph.includes("graph-search") && graph.includes("graph-category"))
assert(graph.includes("graph-outer"), "Native Quartz graph retained")
// Hosted builds use the repository snapshot, without local sync diagnostics.
async function countNotes(dir) {
  let count = 0
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) count += await countNotes(path.join(dir, entry.name))
    else if (entry.name.endsWith(".md")) count++
  }
  return count
}
const expected = await countNotes("content/brain")
const notes = Object.keys(index).filter((s) => s.startsWith("brain/") && !s.endsWith("/index"))
assert.equal(notes.length, expected, "Index includes only synchronized public notes")
for (const slug of notes)
  for (const target of index[slug].links)
    assert(index[target], `Graph edge target exists: ${target}`)
let checked = 0
async function walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await walk(file)
      continue
    }
    if (!file.endsWith(".html")) continue
    const ast = fromHtml(await fs.readFile(file, "utf8"))
    const urls = []
    visit(ast, "element", (n) => {
      for (const key of ["href", "src"])
        if (typeof n.properties?.[key] === "string") urls.push(n.properties[key])
    })
    for (const url of urls) {
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(url)) continue
      let target = decodeURIComponent(url.split(/[?#]/)[0])
      if (!target) continue
      // Pages mounts the output directory at the configured repository subpath.
      if (sitePath && (target === sitePath || target.startsWith(sitePath + "/")))
        target = target.slice(sitePath.length) || "/"
      const full = target.startsWith("/")
        ? path.join(outputRoot, target)
        : path.resolve(path.dirname(file), target)
      const found = await Promise.all(
        [full, full + ".html", path.join(full, "index.html")].map((p) =>
          fs
            .stat(p)
            .then((s) => s.isFile())
            .catch(() => false),
        ),
      )
      assert(found.some(Boolean), `${file}: ${url}`)
      checked++
    }
  }
}
await walk(outputRoot)
console.log(
  `Portfolio validation passed: dynamic projects, public skill links/achievements/contact, ${notes.length} public notes, native graph, search markup, and ${checked} generated local links.`,
)
