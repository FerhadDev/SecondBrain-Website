import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs/promises"
import path from "node:path"
import { sync } from "./sync-obsidian.mjs"
import { validateDirectory, validateProject } from "./project-schema.mjs"

await fs.mkdir(path.resolve(".obsidian-sync"), { recursive: true })

test("project lifecycle, metadata, media, duplicate titles, private transitions and traversal", async () => {
  const root = await fs.mkdtemp(path.resolve(".obsidian-sync/projects-"))
  const source = path.join(root, "Public"),
    destination = path.join(root, "content/brain")
  const options = { source, destination, reportPath: path.join(root, "report.json") }
  const put = async (p, body) => {
    const full = path.join(source, p)
    await fs.mkdir(path.dirname(full), { recursive: true })
    await fs.writeFile(full, body)
  }
  const game = (extra = "", body = "## Overview\nConfirmed overview.\n\n## Lessons Learned\n\n") =>
    `---\ntitle: Test\ntype: project\nvisibility: public\n${extra}---\n${body}`
  await put(
    "Projects/Future/Nested/A.md",
    game("cover: missing.png\nscreenshots: [../../../Private/secret.png]\nvideos: []\n"),
  )
  await put("Projects/Future/Nested/B.md", game())
  await put("Private/secret.png", "PRIVATE_CANARY")
  await put("secret.md", "---\nvisibility: private\n---\nPRIVATE_CANARY")
  await put("reference.md", "[[secret|SECRET_ALIAS]]")
  let result = await sync(options)
  assert(result.synchronized.includes("Projects/Future/Nested/A.md"))
  assert(!result.synchronized.includes("secret.md"))
  const published = await fs.readFile(path.join(destination, "Projects/Future/Nested/A.md"), "utf8")
  assert.doesNotMatch(published, /missing.png|secret.png|Lessons Learned/)
  assert.doesNotMatch(
    await fs.readFile(path.join(destination, "reference.md"), "utf8"),
    /secret|SECRET_ALIAS/,
  )
  assert(
    (await validateDirectory(source)).some((r) => r.issues.some((i) => i.includes("duplicate"))),
  )
  await put("Projects/Future/Nested/shot.webp", "image fixture")
  await put("Projects/Future/Nested/A.md", game("screenshots: [shot.webp]\nfeatured_order: 2\n"))
  await sync(options)
  assert.match(
    await fs.readFile(path.join(destination, "Projects/Future/Nested/A.md"), "utf8"),
    /brain\/Projects\/Future\/Nested\/shot.webp/,
  )
  await fs.rename(
    path.join(source, "Projects/Future/Nested/A.md"),
    path.join(source, "Projects/Future/Nested/Renamed.md"),
  )
  await sync(options)
  await assert.rejects(fs.stat(path.join(destination, "Projects/Future/Nested/A.md")))
  await put(
    "Projects/Future/Nested/Renamed.md",
    "---\ntitle: Test\ntype: project\nvisibility: private\n---\nPRIVATE_CANARY",
  )
  await fs.unlink(path.join(source, "Projects/Future/Nested/shot.webp"))
  await sync(options)
  await assert.rejects(fs.stat(path.join(destination, "Projects/Future/Nested/Renamed.md")))
  await assert.rejects(fs.stat(path.join(destination, "Projects/Future/Nested/shot.webp")))
  await fs.unlink(path.join(source, "Projects/Future/Nested/B.md"))
  await fs.writeFile(path.join(destination, "manual.md"), "KEEP")
  await sync(options)
  assert.equal(await fs.readFile(path.join(destination, "manual.md"), "utf8"), "KEEP")
  assert(validateProject({}).length >= 3)
  assert(
    validateProject({
      title: "T",
      type: "project",
      visibility: "public",
      status: "invented",
      featured: "yes",
      screenshots: 3,
      links: { game: "javascript:alert(1)" },
    }).length >= 4,
  )
})

test("public metadata supplements fill legacy fields without overriding privacy or creating pages", async () => {
  const root = await fs.mkdtemp(path.resolve(".obsidian-sync/supplements-"))
  const source = path.join(root, "Public"),
    destination = path.join(root, "content/brain")
  const rel = "Projects/Team/Blue Diary.md"
  const metadata = {
    title: "Blue Diary",
    type: "project",
    visibility: "public",
    project_id: "blue-diary",
    category: "team",
    status: "discontinued",
    cover: "Projects/Team/cover.png",
  }
  const options = {
    source,
    destination,
    reportPath: path.join(root, "report.json"),
    projectMetadata: { [rel]: metadata },
  }
  const original = "---\nvisibility: public\n---\n# Blue Diary\nPublic text only."
  await fs.mkdir(path.join(source, "Projects/Team"), { recursive: true })
  await fs.writeFile(path.join(source, rel), original)
  await fs.writeFile(path.join(source, "Projects/Team/cover.png"), "public image fixture")
  const first = await sync(options)
  assert.equal(await fs.readFile(path.join(source, rel), "utf8"), original)
  const { data } = (await import("./project-schema.mjs")).frontmatter(
    await fs.readFile(path.join(destination, rel), "utf8"),
  )
  assert.equal(data.title, "Blue Diary")
  assert.equal(data.project_id, "blue-diary")
  assert.equal(data.category, "team")
  assert.equal(data.cover, "brain/Projects/Team/cover.png")
  assert.deepEqual(validateProject(data), [])
  assert.deepEqual(await sync(options), first)
  for (const flag of [
    "visibility: private",
    "draft: true",
    "publish: false",
    "published: false",
    "status: draft",
    "status: unpublished",
    "unlisted: true",
    "encrypted: true",
  ]) {
    await fs.writeFile(path.join(source, rel), `---\n${flag}\n---\nPRIVATE_CANARY`)
    const result = await sync(options)
    assert(!result.synchronized.includes(rel))
    await assert.rejects(fs.stat(path.join(destination, rel)))
  }
  // Explicit source metadata wins over supplements, including future featured settings.
  await fs.writeFile(
    path.join(source, rel),
    "---\nvisibility: public\ntitle: Updated\nfeatured: true\n---\n# Updated",
  )
  await sync(options)
  assert.match(await fs.readFile(path.join(destination, rel), "utf8"), /title: Updated/)
  assert.match(await fs.readFile(path.join(destination, rel), "utf8"), /featured: true/)
  await fs.unlink(path.join(source, rel))
  await sync(options)
  await assert.rejects(fs.stat(path.join(destination, rel)))
  await assert.rejects(
    sync({ ...options, projectMetadata: { "../Private/secret.md": metadata } }),
    /Invalid public project/,
  )
})

test("sync preserves list and paragraph boundaries in documented project sections", async () => {
  const root = await fs.mkdtemp(path.resolve(".obsidian-sync/markdown-"))
  const source = path.join(root, "Public"),
    destination = path.join(root, "content/brain")
  await fs.mkdir(path.join(source, "Projects/Other"), { recursive: true })
  const rel = "Projects/Other/Test.md"
  await fs.writeFile(
    path.join(source, rel),
    "---\ntitle: Test\ntype: project\nvisibility: public\n---\n## My contributions\n\n- Movement system.\n- Daily requirements system.\n\nEngine: Unity. Tool/library: DOTween.\n\nTeam credits are separate.\n\n## Lessons Learned\n\nTo be documented.\n",
  )
  await sync({
    source,
    destination,
    reportPath: path.join(root, "report.json"),
    projectMetadata: {},
  })
  const text = await fs.readFile(path.join(destination, rel), "utf8")
  assert.match(text, /Daily requirements system\.\n\nEngine:/)
  assert.match(text, /DOTween\.\n\nTeam credits/)
  assert(!text.includes("Lessons Learned"))
})

test("video metadata objects retain approved captions and remove unsafe media paths", async () => {
  const root = await fs.mkdtemp(path.resolve(".obsidian-sync/video-schema-"))
  const source = path.join(root, "Public"),
    destination = path.join(root, "content/brain")
  await fs.mkdir(path.join(source, "Projects/Other"), { recursive: true })
  await fs.writeFile(path.join(source, "Projects/Other/clip.mp4"), "video fixture")
  await fs.writeFile(path.join(source, "Projects/Other/poster.png"), "poster fixture")
  await fs.writeFile(
    path.join(source, "Projects/Other/Demo.md"),
    "---\ntitle: Demo\ntype: project\nvisibility: public\nvideos:\n  - src: clip.mp4\n    poster: poster.png\n    title: Approved title\n    description: Approved caption\n    display_mode: playlist\n    autoplay_preview: false\n    loop: false\n  - src: ../../Private/secret.mp4\n    title: Hidden\n  - src: clip.mp4\n    poster: ../../Private/secret.png\n  - src: clip.mp4\n    display_mode: invalid\n---\n## Overview\nConfirmed text.",
  )
  await sync({
    source,
    destination,
    reportPath: path.join(root, "report.json"),
    projectMetadata: {},
  })
  const { frontmatter, validateVideoMetadata } = await import("./project-schema.mjs")
  const { data } = frontmatter(
    await fs.readFile(path.join(destination, "Projects/Other/Demo.md"), "utf8"),
  )
  assert.equal(data.videos.length, 2)
  assert.equal(data.videos[0].src, "brain/Projects/Other/clip.mp4")
  assert.equal(data.videos[0].poster, "brain/Projects/Other/poster.png")
  assert.equal(data.videos[0].description, "Approved caption")
  assert.equal(data.videos[1].poster, undefined)
  assert(!JSON.stringify(data).includes("secret"))
  assert.deepEqual(validateProject(data), [])
  assert(
    validateVideoMetadata({
      src: "clip.mp4",
      loop: "yes",
      display_mode: "unknown",
      start: 5,
      end: 1,
    }).length >= 3,
  )
})

test("generated video posters are withdrawn with removed or changed public sources", async () => {
  const { reconcileVideoPosters } = await import("./video-posters.mjs")
  const { createHash } = await import("node:crypto")
  const root = await fs.mkdtemp(path.resolve(".obsidian-sync/poster-privacy-")),
    contentRoot = path.join(root, "content"),
    manifestPath = path.join(root, "manifest.json")
  const poster = "project-media/posters/0123456789abcdef0123.jpg",
    raw = "brain/Projects/Other/clip.mp4",
    bytes = Buffer.from("approved video")
  await fs.mkdir(path.dirname(path.join(contentRoot, poster)), { recursive: true })
  await fs.writeFile(path.join(contentRoot, "manual.md"), "KEEP")
  const prepare = async () => {
    await fs.writeFile(path.join(contentRoot, poster), "derived frame")
    await fs.writeFile(
      manifestPath,
      JSON.stringify({
        [raw]: { poster, sourceHash: createHash("sha256").update(bytes).digest("hex") },
      }),
    )
  }
  await prepare()
  await reconcileVideoPosters({
    contentRoot,
    manifestPath,
    available: new Map([["Projects/Other/clip.mp4", bytes]]),
  })
  assert.equal(await fs.readFile(path.join(contentRoot, poster), "utf8"), "derived frame")
  await reconcileVideoPosters({ contentRoot, manifestPath, available: new Map() })
  await assert.rejects(fs.stat(path.join(contentRoot, poster)))
  assert.deepEqual(JSON.parse(await fs.readFile(manifestPath, "utf8")), {})
  await prepare()
  await reconcileVideoPosters({
    contentRoot,
    manifestPath,
    available: new Map([["Projects/Other/clip.mp4", Buffer.from("updated public video")]]),
  })
  await assert.rejects(fs.stat(path.join(contentRoot, poster)))
  assert.equal(await fs.readFile(path.join(contentRoot, "manual.md"), "utf8"), "KEEP")
  await fs.writeFile(
    manifestPath,
    JSON.stringify({ [raw]: { poster: "../../manual.md", sourceHash: "invalid" } }),
  )
  await assert.rejects(
    reconcileVideoPosters({ contentRoot, manifestPath, available: new Map() }),
    /ownership path/,
  )
  assert.equal(await fs.readFile(path.join(contentRoot, "manual.md"), "utf8"), "KEEP")
})
