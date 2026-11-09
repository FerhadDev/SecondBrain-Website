import { test } from "node:test"
import assert from "node:assert/strict"
import { VFile } from "vfile"
import type { Root } from "hast"
import {
  preparePublicPresentation,
  unavailableRepository,
  unavailableLabel,
} from "./public-presentation"

test("portfolio title replaces only a leading matching project H1 and preserves its anchor and body", () => {
  const file = new VFile()
  file.data.frontmatter = { title: "Lucid Space", type: "project", visibility: "public" }
  const tree: Root = {
    type: "root",
    children: [
      { type: "text", value: "\n" },
      {
        type: "element",
        tagName: "h1",
        properties: { id: "lucid-space" },
        children: [{ type: "text", value: "Lucid Space" }],
      },
      {
        type: "element",
        tagName: "h2",
        properties: { id: "overview" },
        children: [{ type: "text", value: "Overview" }],
      },
      { type: "element", tagName: "img", properties: { src: "brain/shot.png" }, children: [] },
    ],
  }
  const remaining = tree.children.slice(2)
  preparePublicPresentation(tree, file)
  assert.equal(file.data.portfolioTitleId, "lucid-space")
  assert.deepEqual(tree.children.slice(1), remaining)
  assert(!tree.children.some((n) => n.type === "element" && n.tagName === "h1"))
})

test("unmatched headings remain intact and private flags are never changed", () => {
  for (const visibility of ["public", "private"]) {
    const file = new VFile()
    file.data.frontmatter = { title: "Title", type: "project", visibility }
    const tree: Root = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "h1",
          properties: {},
          children: [{ type: "text", value: "Different heading" }],
        },
      ],
    }
    const before = JSON.stringify(tree)
    preparePublicPresentation(tree, file)
    assert.equal(JSON.stringify(tree), before)
    assert.equal(file.data.frontmatter.visibility, visibility)
  }
})

test("only the verified unavailable repository is de-linked in HTML and public search text", () => {
  const file = new VFile()
  file.data.frontmatter = { title: "Game", type: "project", visibility: "public" }
  file.data.text = `Repository: ${unavailableRepository.slice("https://".length)}\nOther: ${unavailableRepository}-tools`
  file.data.description = `Repository: ${unavailableRepository}`
  const good = "https://farhaddev.itch.io/are-you-king-enough"
  const tree: Root = {
    type: "root",
    children: [unavailableRepository, good].map((href) => ({
      type: "element",
      tagName: "a",
      properties: { href },
      children: [{ type: "text", value: href }],
    })),
  }
  preparePublicPresentation(tree, file)
  assert.deepEqual(tree.children[0], {
    type: "element",
    tagName: "span",
    properties: { className: ["unavailable-reference"] },
    children: [{ type: "text", value: unavailableLabel }],
  })
  assert(tree.children[1].type === "element" && tree.children[1].properties.href === good)
  assert.equal(file.data.text, `Repository: ${unavailableLabel}\nOther: ${unavailableRepository}-tools`)
  assert.equal(file.data.description, `Repository: ${unavailableLabel}`)
})
