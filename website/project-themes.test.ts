import { test } from "node:test"
import assert from "node:assert/strict"
import render from "preact-render-to-string"
import type { QuartzPluginData } from "../quartz/plugins/vfile"
import { projectTheme } from "./project-themes"
import { approvedMedia, type ProjectThemeProps } from "./project-themes/media"
import { BlueDiary } from "./project-themes/BlueDiary"

const note = (extra = {}, slug = "brain/projects/team/blue-diary") =>
  ({ slug, frontmatter: { visibility: "public", ...extra } }) as unknown as QuartzPluginData
const props = (fileData = note(), allFiles: string[] = []): ProjectThemeProps =>
  ({ fileData, ctx: { allFiles }, root: "../../.." }) as ProjectThemeProps

test("theme registry requires the existing public route and never opts private content in", () => {
  assert.equal(projectTheme(note())?.Component, BlueDiary)
  for (const extra of [
    { visibility: "private" },
    { visibility: undefined },
    { draft: true },
    { publish: false },
    { published: false },
    { unlisted: true },
    { encrypted: true },
    { password: "secret" },
    { status: "draft" },
  ])
    assert.equal(projectTheme(note(extra)), undefined)
  assert.equal(projectTheme(note({}, "brain/projects/game-jam/lucid-space")), undefined)
})
test("theme reads only existing approved public assets and sanitized note images", () => {
  const file = note({
    screenshots: [
      "brain/Projects/Team/a.png",
      "brain/Private/secret.png",
      "brain/../secret.png",
      "https://example.com/a.png",
      "brain/Projects/Team/missing.png",
    ],
    videos: ["brain/Projects/Team/video.webm"],
  })
  file.htmlAst = {
    type: "root",
    children: [{ type: "element", tagName: "img", properties: { src: "./b.png" }, children: [] }],
  }
  const media = approvedMedia(
    props(file, [
      "content/brain/Projects/Team/a.png",
      "brain/Projects/Team/b.png",
      "brain/Private/secret.png",
      "brain/Projects/Team/video.webm",
    ]),
  )
  assert.equal(media.images.length, 2)
  assert.equal(media.videos.length, 1)
  assert(!JSON.stringify(media).includes("secret"))
})
test("custom page contains confirmed work and graceful missing media states", () => {
  const html = render(BlueDiary(props()))
  for (const text of [
    "Blue",
    "Diary",
    "Ziver",
    "puzzles",
    "piano",
    "discs",
    "Unity",
    "Discontinued",
  ])
    assert(html.includes(text))
  assert(html.includes("Artwork not yet supplied"))
  assert(!html.includes("\ufffd"))
  assert(html.includes("M\u00f6vlud"))
  assert(!html.includes("<img") && !html.includes("<video"))
  assert(!html.includes("6000.0.48f1") && !html.includes("project-metadata"))
  assert.equal((html.match(/<h1 /g) ?? []).length, 1)
})

test("stable project ID retains the custom theme when a public note changes path", () => {
  assert.equal(
    projectTheme(note({ project_id: "blue-diary" }, "brain/projects/team/renamed"))?.Component,
    BlueDiary,
  )
  assert.equal(
    projectTheme(
      note({ project_id: "blue-diary", visibility: "private" }, "brain/projects/team/renamed"),
    ),
    undefined,
  )
})
