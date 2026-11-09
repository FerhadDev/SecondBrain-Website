import fs from "node:fs/promises"
import path from "node:path"
import assert from "node:assert/strict"
import { fromHtml } from "hast-util-from-html"
import { visit } from "unist-util-visit"

const root = path.resolve(process.argv[2] || "public")
let checked = 0
const errors = []
async function walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await walk(file)
      continue
    }
    if (!entry.name.endsWith(".html")) continue
    const tree = fromHtml(await fs.readFile(file, "utf8"))
    const links = []
    visit(tree, "element", (node) => {
      for (const key of ["href", "src"])
        if (typeof node.properties?.[key] === "string") links.push(node.properties[key])
    })
    for (const link of links) {
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(link)) continue
      const target = decodeURIComponent(link.split(/[?#]/)[0])
      if (!target) continue
      const full = target.startsWith("/")
        ? path.join(root, target)
        : path.resolve(path.dirname(file), target)
      const candidates = [full, full + ".html", path.join(full, "index.html")]
      let found = false
      for (const candidate of candidates) {
        try {
          if ((await fs.stat(candidate)).isFile()) found = true
        } catch {}
      }
      checked++
      if (!found) errors.push({ file: path.relative(root, file), link })
    }
  }
}
await walk(path.join(root, "brain"))
assert.deepEqual(errors, [], "Generated local links must resolve")
const index = JSON.parse(await fs.readFile(path.join(root, "static/contentIndex.json"), "utf8"))
for (const slug of Object.keys(index).filter((s) => /^brain\/projects\//.test(s)))
  await fs.access(path.join(root, slug + ".html"))
console.log(
  `Validated ${checked} local HTML links and indexed project pages (fragment anchors and remote URLs not checked).`,
)
