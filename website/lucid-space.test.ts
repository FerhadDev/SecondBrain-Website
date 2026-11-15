import { test } from "node:test"
import assert from "node:assert/strict"
import render from "preact-render-to-string"
import { LucidSpace } from "./project-themes/LucidSpace"
import { projectTheme } from "./project-themes"
import type { ProjectThemeProps } from "./project-themes/media"
import type { FilePath } from "../quartz/util/path"

const assets = ["title.png", "ship1.png", "ship2.png", "ship3.png", "trailer.mp4"]
  .map((file) => `brain/Projects/Game-Jam/Attachments/${file}`)
const element = (tagName: string, value: string) => ({
  type: "element", tagName, properties: {}, children: [{ type: "text", value }],
})
const list = (...values: string[]) => ({
  type: "element", tagName: "ul", properties: {}, children: values.map((v) => element("li", v)),
})
const props = () => ({
  root: "../../..",
  fileData: {
    slug: "brain/projects/game-jam/lucid-space", filePath: "content/brain/Projects/Game-Jam/Lucid Space.md",
    frontmatter: {
      title: "Lucid Space", type: "project", visibility: "public", project_id: "lucid-space",
      genre: "Puzzle", engine: "Unity", role: "Game Developer", platform: "Windows",
      studio: "Trojan Horse Studios",
      cover: assets[0], screenshots: assets.slice(0, 4), videos: [assets[4]],
      "official-url": "https://hyperarcstudios.itch.io/lucid-space",
    },
    htmlAst: { type: "root", children: [
      element("h2", "Project overview"), element("p", "A public puzzle prototype by Trojan Horse Studios."),
      element("h2", "Gameplay"), list("Genre: Puzzle."),
      element("p", "Collect music discs to gain abilities and solve puzzles."),
      element("h2", "My contributions"), list("Role: Game Developer.", "Specific systems: To be documented."),
      element("h2", "Technologies used"), list("Engine and version: Unity 6.3 LTS", "Libraries: To be confirmed."),
    ] },
  }, ctx: { allFiles: assets.map((f) => "content/" + f) },
}) as unknown as ProjectThemeProps

test("Lucid theme uses documented mechanics/contributions, original media and native video", () => {
  const html = render(LucidSpace(props()))
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1)
  assert.equal((html.match(/<img\b/g) ?? []).length, 4)
  assert.equal((html.match(/<video\b/g) ?? []).length, 1)
  for (const text of ["Music-disc abilities", "Collect music discs", "Role: Game Developer.", "Unity 6.3 LTS", "controls", "preload=\"metadata\"", "poster=", "https://hyperarcstudios.itch.io/lucid-space"])
    assert(html.includes(text), text)
  assert(!html.includes("To be confirmed") && !html.includes("To be documented"))
  assert.equal((html.match(/Collect music discs/g) ?? []).length, 1)
  assert(html.includes("Trojan Horse Studios"))
  assert(html.includes("Specific systems and technical contributions have not yet been documented."))
  assert(!html.includes("Studio attribution needs owner confirmation"))
})

test("missing media stays absent; theme cannot opt private notes in and follows stable project ID", () => {
  const p = props()
  p.ctx.allFiles = []
  const html = render(LucidSpace(p))
  assert(!html.includes("<img") && !html.includes("<video"))
  assert.equal(projectTheme(p.fileData)?.Component, LucidSpace)
  for (const flag of [{ visibility: "private" }, { draft: true }, { publish: false }, { encrypted: true }])
    assert.equal(projectTheme({ ...p.fileData, frontmatter: { ...p.fileData.frontmatter, ...flag } } as any), undefined)
  assert.equal(projectTheme({ ...p.fileData, slug: "brain/projects/renamed", frontmatter: { ...p.fileData.frontmatter, project_id: "lucid-space" } } as any)?.Component, LucidSpace)
})

test("design board is a planning reference with a full-size viewer, separate from gameplay screenshots", () => {
  const p = props()
  const board = "brain/Projects/Game-Jam/Attachments/design.png"
  p.ctx.allFiles.push(("content/" + board) as FilePath)
  p.fileData.htmlAst!.children.push(
    element("h2", "Game Design & Development") as any,
    element("p", "Early planning concepts; not all features are implemented.") as any,
    { type: "element", tagName: "img", properties: { src: "../../../" + board.toLowerCase() }, children: [] },
  )
  const html = render(LucidSpace(p))
  assert(html.includes("Game Design &amp; Development"))
  assert(html.includes("Planned concepts — implementation is not confirmed"))
  assert(html.includes("Early planning concepts"))
  assert(html.includes('id="lucid-game-design-and-development"'))
  assert(html.includes("View full-resolution board"))
  assert(html.includes('role="region"') && html.includes('tabindex="0"'))
  const gallery = html.split('class="lucid-gallery"')[1].split("</section>")[0]
  assert.equal((gallery.match(/<img\b/g) ?? []).length, 3)
  assert(!gallery.includes("design.png"))
  assert.equal((html.match(/<video\b/g) ?? []).length, 1)
  p.ctx.allFiles = p.ctx.allFiles.filter((f) => !f.endsWith("design.png"))
  assert(!render(LucidSpace(p)).includes('id="lucid-game-design-and-development"'))
})
