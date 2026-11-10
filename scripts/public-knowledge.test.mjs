import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs/promises"
import path from "node:path"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { sync } from "./sync-obsidian.mjs"
import { frontmatter, validateKnowledgeNote, validateProject } from "./project-schema.mjs"
import { validatePublicContent } from "./validate-public-content.mjs"

test("real public fixture notes synchronize categories/relationships; graph filters use those notes", async () => {
  await fs.mkdir(".obsidian-sync", { recursive: true })
  const root = await fs.mkdtemp(path.resolve(".obsidian-sync/knowledge-"))
  const source = path.join(root, "Public"),
    destination = path.join(root, "content/brain")
  const put = async (p, s) => {
    const full = path.join(source, p)
    await fs.mkdir(path.dirname(full), { recursive: true })
    await fs.writeFile(full, s)
  }
  await put(
    "About-Me.md",
    "---\ntitle: About Me\ntype: profile\nvisibility: public\n---\n## Connect With Me\n[LinkedIn](www.linkedin.com/in/ferhadzamanov)\n[[Public/Skills/Unity]] [[Public/Achievements/Result]]",
  )
  await put(
    "Skills/Unity.md",
    "---\ntitle: Unity\ntype: skill\ncategory: Skills\nvisibility: public\ntags: [skill]\n---\n[[Public/About-Me]] [[Public/Projects/Lucid-Space]]",
  )
  await put(
    "Topics/CSharp.md",
    "---\ntitle: CSharp\ntype: skill\nvisibility: public\ntags: [skill]\n---\n[[Public/About-Me]]",
  )
  await put(
    "Achievements/Result.md",
    "---\ntitle: Fixture result\ntype: achievement\ncategory: Achievements\nvisibility: public\ntags: [achievement]\n---\n[[Public/About-Me]] [[Public/Projects/Lucid-Space]]",
  )
  await put(
    "Projects/Lucid-Space.md",
    "---\ntitle: Lucid Space\ntype: project\nvisibility: public\ndistribution: download\n---\n[[Public/Skills/Unity]]",
  )
  await put("Private/Secret.md", "PRIVATE CANARY")
  const options = {
    source,
    destination,
    reportPath: path.join(root, "report.json"),
    projectMetadata: {},
  }
  const report = await sync(options)
  assert.deepEqual(report.issues, [])
  assert.equal(report.synchronized.length, 5)
  await validatePublicContent(path.join(root, "content"))
  const about = await fs.readFile(path.join(destination, "About-Me.md"), "utf8")
  assert(about.includes("https://www.linkedin.com/in/ferhadzamanov/"))
  assert.equal(
    frontmatter(await fs.readFile(path.join(destination, "Projects/Lucid-Space.md"), "utf8")).data
      .distribution,
    "download",
  )
  const slug = (p) => "brain/" + p.replace(/\.md$/, "").toLowerCase()
  const index = {}
  for (const rel of report.synchronized) {
    const text = await fs.readFile(path.join(destination, rel), "utf8"),
      { data } = frontmatter(text)
    index[slug(rel)] = {
      title: data.title,
      tags: data.tags || [],
      links: [...text.matchAll(/\]\((brain\/[^)]+\.md)\)/g)].map((m) =>
        m[1].replace(/\.md$/, "").toLowerCase(),
      ),
    }
  }
  assert(index["brain/skills/unity"].links.includes("brain/about-me"))
  assert(index["brain/achievements/result"].links.includes("brain/projects/lucid-space"))
  const indexPath = path.join(root, "contentIndex.json")
  await fs.writeFile(indexPath, JSON.stringify(index))
  await promisify(execFile)(process.execPath, ["scripts/test-portfolio-graph.mjs", indexPath])
  assert.deepEqual(await sync(options), report)
})

test("knowledge-note and distribution schemas reject unsupported metadata", () => {
  assert.equal(
    validateProject({
      title: "Game",
      type: "project",
      visibility: "public",
      distribution: "download",
    }).length,
    0,
  )
  assert(
    validateProject({
      title: "Game",
      type: "project",
      visibility: "public",
      distribution: "unknown",
    }).length,
  )
  for (const type of ["skill", "achievement"]) {
    assert.equal(validateKnowledgeNote({ title: "Topic", type, visibility: "public" }).length, 0)
    assert(validateKnowledgeNote({ title: "", type, visibility: "public", tags: [42] }).length)
  }
})
