import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs/promises"
import vm from "node:vm"
import render from "preact-render-to-string"
import type { QuartzPluginData } from "../quartz/plugins/vfile"
import { KingsCourt } from "./project-themes/KingsCourt"
import { CourtMedia, ProjectVideo } from "./project-themes/CourtMedia"
import { projectTheme } from "./project-themes"
import { approvedMedia, type ProjectThemeProps } from "./project-themes/media"
const paragraph = (text: string) => ({
  type: "element",
  tagName: "p",
  properties: {},
  children: [{ type: "text", value: text }],
})
const heading = (text: string) => ({ ...paragraph(text), tagName: "h2" })
const list = (items: string[]) => ({
  type: "element",
  tagName: "ul",
  properties: {},
  children: items.map((text) => ({ ...paragraph(text), tagName: "li" })),
})
const file = (extra = {}) =>
  ({
    slug: "brain/projects/game-jam/are-you-king-enough",
    frontmatter: {
      title: "Are You King Enough",
      project_id: "are-you-king-enough",
      visibility: "public",
      engine: "Unity",
      status: "stopped",
      ...extra,
    },
    htmlAst: {
      type: "root",
      children: [
        heading("Overview"),
        paragraph("The player is a king. Resources are limited."),
        heading("Game jam"),
        list(["Event: GameJamPlus 2026", "Duration: 48 hours"]),
        heading("Team and my role"),
        list(["My role: Team leader and game developer", "Fidan: 2D artist."]),
        heading("My contributions and portfolio evidence"),
        list([
          "NPC movement systems using DOTween.",
          "NPC animations implemented through code.",
          "Main menu.",
          "NPC ScriptableObjects.",
          "Game daily requirements system.",
        ]),
        paragraph("Engine: Unity. Tool/library: DOTween."),
      ],
    },
  }) as unknown as QuartzPluginData
const props = (fileData = file()) =>
  ({ fileData, ctx: { allFiles: [] }, root: "../../.." }) as unknown as ProjectThemeProps

test("King theme follows stable ID and public flags without changing discovery", () => {
  assert.equal(projectTheme(file())?.Component, KingsCourt)
  for (const flags of [
    { visibility: "private" },
    { draft: true },
    { publish: false },
    { published: false },
    { unlisted: true },
    { encrypted: true },
    { status: "draft" },
  ])
    assert.equal(projectTheme(file(flags)), undefined)
  const renamed = file()
  renamed.slug = "brain/projects/other/renamed" as typeof renamed.slug
  assert.equal(projectTheme(renamed)?.Component, KingsCourt)
})
test("court sections use the public note, omit undocumented language, and do not invent contributions", () => {
  const html = render(KingsCourt(props()))
  assert.equal((html.match(/court-work-number/g) ?? []).length, 5)
  for (const text of [
    "DOTween",
    "NPC ScriptableObjects",
    "Main menu",
    "48 hours",
    "Team leader and game developer",
    "Development stopped",
  ])
    assert(html.includes(text))
  assert(
    !html.includes("<dt>Language</dt>") &&
      !html.includes("C#") &&
      !html.includes("Health") &&
      !html.includes("combat"),
  )
  const empty = file()
  empty.htmlAst = { type: "root", children: [] }
  const emptyHtml = render(KingsCourt(props(empty)))
  assert(!emptyHtml.includes('id="court-work"') && !emptyHtml.includes('id="court-overview"'))
})
test("court media supports safe embedded GIF and MP4/WebM inputs with muted native controls", () => {
  const data = file({
    screenshots: ["brain/media/still.gif"],
    videos: ["brain/media/clip.mp4", "brain/Private/secret.webm"],
  })
  data.htmlAst = {
    type: "root",
    children: [
      {
        type: "element",
        tagName: "video",
        properties: { src: "../../../brain/media/embed.webm" },
        children: [],
      },
    ],
  }
  const media = approvedMedia({
    ...props(data),
    ctx: {
      allFiles: [
        "brain/media/still.gif",
        "brain/media/clip.mp4",
        "brain/media/embed.webm",
        "brain/Private/secret.webm",
      ],
    },
  } as ProjectThemeProps)
  assert.equal(media.images.length, 1)
  assert.equal(media.videos.length, 2)
  const html = render(CourtMedia({ media }))
  assert(
    html.includes(".gif") &&
      html.includes(".mp4") &&
      html.includes(".webm") &&
      html.includes("muted") &&
      html.includes("controls"),
  )
  assert(!html.includes("secret") && !html.includes("autoplay"))
  const preview = render(ProjectVideo({ src: "approved.webm", preview: true }))
  assert(
    preview.includes("loop") &&
      preview.includes("data-project-preview") &&
      preview.includes("muted"),
  )
})
test("video behavior pauses offscreen/hidden clips and honors reduced motion for opt-in loops", async () => {
  const video = (preview: boolean) => ({
    preview,
    muted: false,
    plays: 0,
    pauses: 0,
    hasAttribute: () => preview,
    play() {
      this.plays++
      return Promise.resolve()
    },
    pause() {
      this.pauses++
    },
  })
  const manual = video(false),
    preview = video(true),
    videos = [manual, preview]
  const listeners: Record<string, () => void> = {}
  let intersect: (entries: unknown[]) => void = () => {}
  const motion = {
    matches: false,
    addEventListener: (_name: string, fn: () => void) => {
      listeners.motion = fn
    },
    removeEventListener() {},
  }
  const document = {
    hidden: false,
    querySelectorAll: () => videos,
    addEventListener: (name: string, fn: () => void) => {
      listeners[name] = fn
    },
    removeEventListener() {},
  }
  class Observer {
    constructor(callback: typeof intersect) {
      intersect = callback
    }
    observe() {}
    disconnect() {}
  }
  vm.runInNewContext(await fs.readFile("quartz/static/project-media.js", "utf8"), {
    window: { IntersectionObserver: Observer },
    document,
    matchMedia: () => motion,
    IntersectionObserver: Observer,
  })
  intersect(videos.map((target) => ({ target, isIntersecting: true })))
  assert.equal(manual.plays, 0)
  assert.equal(preview.plays, 1)
  assert.equal(preview.muted, true)
  const previous = preview.plays
  motion.matches = true
  listeners.motion()
  assert.equal(preview.plays, previous)
  const pauses = manual.pauses
  intersect([{ target: manual, isIntersecting: false }])
  assert(manual.pauses > pauses)
  document.hidden = true
  const hiddenPauses = preview.pauses
  listeners.visibilitychange()
  assert(preview.pauses > hiddenPauses)
  listeners.nav()
  assert.equal(manual.plays, 0)
})
