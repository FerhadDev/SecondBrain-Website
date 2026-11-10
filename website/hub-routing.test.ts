import { test } from "node:test"
import assert from "node:assert/strict"
import { VFile } from "vfile"
import type { Root } from "hast"
import { installPublicHubRouting, rebaseHubTree } from "./hub-routing"
import { preparePublicPresentation } from "./public-presentation"

test("public folder hubs reuse authored content and preserve listings, resources and source slugs", () => {
  const tree: Root = { type: "root", children: [{ type: "element", tagName: "a", properties: { href: "../brain/skills/unity#example" }, children: [] }] }
  const file = new VFile()
  file.data = { slug: "brain/skills", frontmatter: { title: "Skills", visibility: "public" } } as any
  const original = structuredClone(tree)
  const body = Object.assign((props: any) => ({ tree: props.tree, listing: true }), { css: "listing-css" })
  const plugin: any = { name: "FolderPage", generate: () => [{ slug: "brain/skills/index", title: "Skills", data: {} }], body: () => body }
  installPublicHubRouting([plugin])
  const [page] = plugin.generate({ content: [[tree, file]] })
  const rendered = plugin.body()
  const result = rendered({ tree: { type: "root", children: [] }, fileData: { ...page.data, slug: page.slug } })
  assert.equal(page.slug, "brain/skills/index")
  assert.equal(result.tree.children[0].properties.href, "../../brain/skills/unity#example")
  assert(result.listing)
  assert.equal(rendered.css, "listing-css")
  assert.deepEqual(tree, original)
  for (const frontmatter of [{ visibility: "private" }, { visibility: "public", type: "project" }, { visibility: "public", publish: false }]) {
    file.data.frontmatter = frontmatter as any
    assert.equal(plugin.generate({ content: [[tree, file]] })[0].data.publicHubSlug, undefined)
  }
})

test("hub URL rebasing leaves external URLs and anchors intact; matching hub H1 uses frame title", () => {
  const tree: Root = { type: "root", children: [{ type: "element", tagName: "h1", properties: { id: "skills" }, children: [{ type: "text", value: "Skills" }] }] }
  const file = new VFile()
  file.data.frontmatter = { title: "Skills", visibility: "public" }
  preparePublicPresentation(tree, file)
  assert.equal(tree.children.length, 0)
  assert.equal(file.data.portfolioTitleId, "skills")
  for (const href of ["https://example.com/", "#skills", "/root", "mailto:test@example.com"]) {
    const linked: Root = { type: "root", children: [{ type: "element", tagName: "a", properties: { href }, children: [] }] }
    assert.deepEqual(rebaseHubTree(linked, "brain/skills", "brain/skills/index"), linked)
  }
})
