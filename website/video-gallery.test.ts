import { test } from "node:test"
import assert from "node:assert/strict"
import render from "preact-render-to-string"
import { projectVideos } from "./project-themes/video-data"
import { publicMediaUrl, type ProjectThemeProps } from "./project-themes/media"
import { FeaturedVideoPlayer } from "./FeaturedVideoPlayer"
const props = (videos: unknown[], assets: string[] = []) =>
  ({
    fileData: {
      slug: "brain/projects/future/demo",
      frontmatter: { title: "Future project", type: "project", visibility: "public", videos },
    },
    ctx: { allFiles: assets },
    root: "../../..",
  }) as unknown as ProjectThemeProps

test("new public videos are discovered without project-specific code or configuration", () => {
  const data = props(
    [
      "brain/Projects/Future/first.mp4",
      {
        src: "brain/Projects/Future/second.webm",
        title: "Owner caption",
        description: "Documented clip",
        category: "piano",
        display_mode: "playlist",
        autoplay_preview: false,
        loop: false,
        poster: "brain/Projects/Future/poster.png",
      },
    ],
    [
      "brain/Projects/Future/first.mp4",
      "brain/Projects/Future/second.webm",
      "brain/Projects/Future/poster.png",
    ],
  )
  const videos = projectVideos(data)
  assert.equal(videos.length, 2)
  assert.equal(videos[0].title, "Gameplay clip 1")
  assert.equal(videos[0].category, "gameplay")
  assert.equal(videos[1].title, "Owner caption")
  assert.equal(videos[1].category, "piano")
  assert(videos[1].poster.endsWith("/poster.png"))
})
test("media resolver excludes private, missing, and traversal paths even when metadata supplies them", () => {
  const data = props(
    [
      "brain/Private/secret.mp4",
      "brain/Projects/Future/missing.mp4",
      "brain/Projects/../secret.mp4",
      "https://example.com/stock.mp4",
      { src: "brain/Projects/Future/valid.mp4", poster: "brain/Private/secret.png" },
    ],
    ["brain/Private/secret.mp4", "brain/Private/secret.png", "brain/Projects/Future/valid.mp4"],
  )
  const videos = projectVideos(data)
  assert.equal(videos.length, 1)
  assert.equal(videos[0].poster, "")
  assert.equal(publicMediaUrl(data, "brain/%2e%2e/secret.mp4"), "")
  assert.equal(publicMediaUrl(data, "project-media/posters/fake.jpg", true), "")
})
test("featured player uses one deferred video, accessible selection controls and a missing-poster fallback", () => {
  const videos = projectVideos(
    props(
      ["brain/Projects/Future/first.mp4", "brain/Projects/Future/second.mp4"],
      ["brain/Projects/Future/first.mp4", "brain/Projects/Future/second.mp4"],
    ),
  )
  const player = FeaturedVideoPlayer({ videos, id: "example", label: "Gameplay" })
  assert(player)
  const html = render(player)
  assert.equal((html.match(/<video /g) ?? []).length, 1)
  assert.equal((html.match(/data-video-select=/g) ?? []).length, 2)
  assert(html.includes('preload="none"') && html.includes("muted") && html.includes("controls"))
  assert(!html.includes("autoplay="))
  assert(
    html.includes("data-thumbnail-fallback") &&
      html.includes('aria-pressed="true"') &&
      html.includes("data-video-fullscreen"),
  )
  assert(html.includes("<noscript>"))
  assert.equal(FeaturedVideoPlayer({ videos: [], id: "empty", label: "Empty" }), null)
})
