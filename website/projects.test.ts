import assert from "node:assert/strict"
import { test } from "node:test"
import type { QuartzPluginData } from "../quartz/plugins/vfile"
import { discoverProjects } from "./projects"
import render from "preact-render-to-string"
import { ProjectsShowcase } from "./ProjectsShowcase"
import fs from "node:fs/promises"
import vm from "node:vm"

const note = (slug: string, frontmatter: Record<string, unknown> = {}, htmlAst?: unknown) =>
  ({
    slug: slug.replace(/^brain\//, "brain/Projects/"),
    filePath: `content/${slug.replace(/^brain\//, "brain/Projects/")}.md`,
    frontmatter: { visibility: "public", ...frontmatter },
    htmlAst,
  }) as unknown as QuartzPluginData
const paragraph = (value: string) => ({
  type: "element",
  tagName: "p",
  properties: {},
  children: [{ type: "text", value }],
})
const ast = (...children: unknown[]) => ({ type: "root", children })

test("gallery controls combine case-insensitive text and category filters, announce empty results, and reset", async () => {
  const element = (extra = {}) => ({
    hidden: false,
    value: "",
    textContent: "",
    dataset: {},
    listeners: {} as Record<string, () => void>,
    addEventListener(event: string, listener: () => void) {
      this.listeners[event] = listener
    },
    focus() {
      focused = true
    },
    ...extra,
  })
  let focused = false
  const cards = [
    element({ textContent: "Alpha Unity mechanics", dataset: { category: "Game Jam" } }),
    element({ textContent: "Beta C# systems", dataset: { category: "Prototype" } }),
  ]
  const search = element(),
    category = element(),
    count = element(),
    empty = element(),
    reset = element(),
    controls = element({ hidden: true })
  const parts = {
    "[data-gallery-search]": search,
    "[data-gallery-category]": category,
    "[data-gallery-count]": count,
    "[data-gallery-empty]": empty,
    "[data-gallery-reset]": reset,
    "[data-gallery-controls]": controls,
  }
  const gallery = {
    dataset: {},
    querySelector: (key: keyof typeof parts) => parts[key],
    querySelectorAll: () => cards,
  }
  const document = { querySelectorAll: () => [gallery], addEventListener() {} }
  vm.runInNewContext(await fs.readFile("quartz/static/projects-gallery.js", "utf8"), {
    window: {},
    document,
  })
  assert.equal(controls.hidden, false)
  assert.equal(count.textContent, "2 projects")
  category.value = "Prototype"
  category.listeners.change()
  assert.deepEqual(
    cards.map((c) => c.hidden),
    [true, false],
  )
  search.value = "  BETA   C# "
  search.listeners.input()
  assert.equal(count.textContent, "1 project of 2")
  search.value = "Unity"
  search.listeners.input()
  assert(cards.every((c) => c.hidden))
  assert.equal(empty.hidden, false)
  reset.listeners.click()
  assert(cards.every((c) => !c.hidden))
  assert.equal(empty.hidden, true)
  assert.equal(focused, true)
})

test("renders empty and incomplete projects with honest placeholders and no broken links", () => {
  const props = { allFiles: [], ctx: { allFiles: [] }, root: "." } as unknown as Parameters<
    typeof ProjectsShowcase
  >[0]
  const empty = render(ProjectsShowcase(props))
  assert(empty.includes("Projects are on the way."))
  const minimal = render(
    ProjectsShowcase({ ...props, allFiles: [note("brain/new-project", { type: "project" })] }),
  )
  assert(minimal.includes("Project overview coming soon."))
  assert(minimal.includes("Uncategorized"))
  assert(minimal.includes("No public cover image supplied"))
  assert(minimal.includes('href="./brain/Projects/new-project"'))
  assert(!minimal.includes("<img") && !minimal.includes("itch.io"))
})

test("discovers frontmatter projects in nested public Projects folders, not folder listings or ordinary notes", () => {
  const found = discoverProjects([
    note("brain/experiments/new-game", { type: "project", title: "New Game" }),
    note("brain/projects/jam", { type: "project", "project-type": "game jam", title: "Jam" }),
    note("brain/projects/not-a-project", { title: "Not a project" }),
    note("brain/projects/index", { type: "project" }),
    note("projects", { type: "project" }),
  ])
  assert.deepEqual(
    found.map((p) => p.title),
    ["Jam", "New Game"],
  )
})

test("rejects private, template, hidden, unpublished, encrypted, and malformed public-note candidates", () => {
  const blocked = [
    note("brain/private/secret", { type: "project" }),
    note("brain/Templates/secret", { type: "project" }),
    note("brain/.hidden/secret", { type: "project" }),
    note("brain/%70rivate/secret", { type: "project" }),
    note("brain/%invalid", { type: "project" }),
    ...[
      { visibility: "private" },
      { visibility: "unlisted" },
      { publish: false },
      { draft: true },
      { unlisted: true },
      { password: "test" },
      { encrypted: true },
    ].map((fm) => note("brain/secret", { type: "project", ...fm })),
  ]
  assert.deepEqual(discoverProjects(blocked), [])
})

test("missing and incorrectly typed optional metadata never crashes or invents media or technologies", () => {
  const [project] = discoverProjects([
    note("brain/new-project", {
      type: "project",
      title: { bad: true },
      description: [],
      technologies: [null, 4, {}, "To be confirmed"],
      category: 4,
      cover: 123,
      "official-url": "javascript:alert(1)",
      order: {},
    }),
  ])
  assert.equal(project.title, "new project")
  assert.equal(project.category, "Uncategorized")
  assert.equal(project.description, "")
  assert.deepEqual(project.technologies, [])
  assert.equal(project.cover, "")
  assert.equal(project.itch, "")
  assert.equal(project.order, Infinity)
  assert.deepEqual(discoverProjects([]), [])
})

test("uses only confirmed metadata or explicit technology labels, not incidental mentions", () => {
  const [project] = discoverProjects([
    note(
      "brain/test",
      {
        type: "project",
        engine: "Unity",
        technologies: ["C#", "Unity", "Unknown", "DOTween: to be confirmed"],
      },
      ast(
        paragraph("We might use Unreal Engine, but it is not confirmed."),
        paragraph("Engine: Unity 6000.3.6f1. Tool/library: DOTween."),
      ),
    ),
  ])
  assert.deepEqual(project.technologies, ["Unity", "C#", "DOTween"])
})

test("featured first, ascending numeric order, then stable alphabetical fallback", () => {
  const notes = [
    note("brain/a", { type: "project", title: "A", order: 2 }),
    note("brain/z", { type: "project", title: "Z", featured: true }),
    note("brain/b", { type: "project", title: "B", order: "1" }),
    note("brain/c", { type: "project", title: "C", order: "invalid" }),
  ]
  assert.deepEqual(
    discoverProjects(notes).map((p) => p.title),
    ["Z", "B", "A", "C"],
  )
})

test("cover resolution requires an existing public raster asset and rejects ambiguous or external covers", () => {
  const assets = ["brain/media/Game Cover.png", "brain/media/other.jpg"]
  const cover = (raw: string, available = assets) =>
    discoverProjects([note("brain/demo", { type: "project", cover: raw })], available)[0].cover
  assert.equal(cover("brain/media/Game Cover.png"), "brain/media/game-cover.png")
  assert.equal(cover("![[Game Cover.png]]"), "brain/media/game-cover.png")
  assert.equal(cover("[cover](brain/media/Game%20Cover.png)"), "brain/media/game-cover.png")
  assert.equal(cover("missing.png"), "")
  assert.equal(cover("https://example.com/fake.png"), "")
  assert.equal(cover("brain/private/secret.png", ["brain/private/secret.png"]), "")
  assert.equal(cover("same.png", ["brain/one/same.png", "brain/two/same.png"]), "")
  assert.equal(cover("brain/media/file.svg", ["brain/media/file.svg"]), "")
})

test("overview stops at the next section and external links are restricted to genuine HTTPS itch.io hosts", () => {
  const heading = (name: string) => ({
    type: "element",
    tagName: "h2",
    properties: {},
    children: [{ type: "text", value: name }],
  })
  const [project] = discoverProjects([
    note(
      "brain/test",
      { type: "project", "official-url": "https://itch.io.evil.example/game" },
      ast(
        heading("Overview"),
        heading("Challenges"),
        paragraph("This must not become the overview."),
        {
          type: "element",
          tagName: "a",
          properties: { href: "https://studio.itch.io/game" },
          children: [],
        },
      ),
    ),
  ])
  assert.equal(project.description, "")
  assert.equal(project.itch, "https://studio.itch.io/game")
})

test("strict publication, path discovery, duplicate titles and featured_order", () => {
  const eligible = (slug: string, extra = {}) =>
    ({
      slug,
      filePath: `content/${slug}.md`,
      frontmatter: { title: "Same", type: "project", visibility: "public", ...extra },
    }) as unknown as QuartzPluginData
  const projects = discoverProjects([
    eligible("brain/Projects/Other/Future/a", { featured: true, featured_order: 5 }),
    eligible("brain/Projects/Team/b", { featured: true, featured_order: 1 }),
    eligible("brain/Projects/Personal/no-visibility", { visibility: undefined }),
    eligible("brain/Projects/Teaching/no-type", { type: undefined }),
    eligible("brain/elsewhere/c"),
    eligible("brain/Projects/Other/unpublished", { published: false }),
  ])
  assert.equal(projects.length, 2)
  assert.equal(projects[0].slug, "brain/Projects/Team/b")
  assert.equal(projects[0].title, projects[1].title)
})
import { ProjectMedia } from "./ProjectMedia"

test("reusable media gallery includes approved images and videos only", () => {
  const props = {
    fileData: note("brain/demo", {
      screenshots: ["brain/media/a.webp", "brain/media/missing.png", "brain/Private/secret.png"],
      videos: ["brain/media/demo.webm", "https://example.com/private.mp4"],
    }),
    ctx: { allFiles: ["brain/media/a.webp", "brain/media/demo.webm", "brain/Private/secret.png"] },
    root: "../..",
  } as unknown as Parameters<typeof ProjectMedia>[0]
  const media = ProjectMedia(props)
  assert(media)
  const html = render(media)
  assert(html.includes("<video") && html.includes("controls") && html.includes("<img"))
  assert(!html.includes("missing") && !html.includes("secret") && !html.includes("example.com"))
  assert.equal(ProjectMedia({ ...props, fileData: note("brain/empty") }), null)
})

test("team project metadata renders a card linking to its existing custom route", () => {
  const slug = "brain/projects/team/blue-diary"
  const file = {
    slug,
    filePath: "content/brain/Projects/Team/Blue Diary.md",
    frontmatter: {
      title: "Blue Diary",
      type: "project",
      visibility: "public",
      project_id: "blue-diary",
      category: "team",
      genre: "Adventure / Puzzle",
      engine: "Unity",
      status: "discontinued",
      cover: "brain/Projects/Team/cover.png",
      featured: true,
    },
  } as unknown as QuartzPluginData
  const [project] = discoverProjects([file], ["brain/Projects/Team/cover.png"])
  assert.equal(project.slug, slug)
  assert.equal(project.category, "Team")
  assert.equal(project.featured, true)
  const html = render(
    ProjectsShowcase({
      allFiles: [file],
      ctx: { allFiles: ["brain/Projects/Team/cover.png"] },
      root: ".",
    } as unknown as Parameters<typeof ProjectsShowcase>[0]),
  )
  for (const value of [
    "Blue Diary",
    "Team Project",
    "Adventure / Puzzle",
    "Unity",
    "Discontinued",
    "./brain/projects/team/blue-diary",
    "brain/projects/team/cover.png",
  ])
    assert(html.includes(value))
  assert.equal((html.match(/data-gallery-card/g) ?? []).length, 1)
})
