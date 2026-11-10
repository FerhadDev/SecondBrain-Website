import { test } from "node:test"
import assert from "node:assert/strict"
import type { QuartzPluginData } from "../quartz/plugins/vfile"
import { itchActionLabel, profileLinks } from "./profile-links"
import { discoverProjects } from "./projects"

test("distribution is explicit: download/browser labels; unknown games make no browser-play claim", () => {
  assert.equal(itchActionLabel("download"), "Download on itch.io")
  assert.equal(itchActionLabel("browser"), "Play on itch.io")
  assert.equal(itchActionLabel(), "View on itch.io")
  const projects = discoverProjects(
    [
      {
        slug: "brain/projects/game-jam/game",
        filePath: "content/brain/Projects/Game-Jam/Game.md",
        frontmatter: {
          title: "Game",
          type: "project",
          visibility: "public",
          distribution: "download",
        },
      } as unknown as QuartzPluginData,
    ],
    [],
  )
  assert.equal(projects[0].distribution, "download")
})

test("profile contacts come only from the public Connect With Me section and safe provider URLs", () => {
  const link = (href: string) => ({
    type: "element",
    tagName: "a",
    properties: { href },
    children: [],
  })
  const file = {
    frontmatter: { visibility: "public" },
    htmlAst: {
      type: "root",
      children: [
        link("https://github.com/not-the-contact"),
        { type: "element", tagName: "h2", children: [{ type: "text", value: "Connect With Me" }] },
        ...[
          "https://github.com/FerhadDev",
          "https://farhaddev.itch.io",
          "https://www.linkedin.com/in/ferhadzamanov/",
          "https://github.com.evil.test/name",
          "javascript:alert(1)",
          "https://user:secret@github.com/name",
        ].map(link),
      ],
    },
  } as unknown as QuartzPluginData
  assert.deepEqual(
    profileLinks(file).map((l) => l.label),
    ["GitHub", "itch.io", "LinkedIn"],
  )
  assert.equal(profileLinks(file)[2].href, "https://www.linkedin.com/in/ferhadzamanov/")
  assert.deepEqual(profileLinks(), [])
})
