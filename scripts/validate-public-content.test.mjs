import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs/promises"
import path from "node:path"
import { validatePublicContent } from "./validate-public-content.mjs"

async function fixture() {
  await fs.mkdir(".obsidian-sync", { recursive: true })
  return fs.mkdtemp(path.resolve(".obsidian-sync/pages-privacy-"))
}

test("repository snapshot accepts public notes and rejects publication flags and credentials", async () => {
  const root = await fixture()
  await fs.mkdir(path.join(root, "brain"))
  const note = path.join(root, "brain/profile.md")
  await fs.writeFile(note, "---\nvisibility: public\n---\nApproved profile")
  assert.equal(await validatePublicContent(root), 1)
  for (const flag of ["draft: true", "publish: false", "visibility: private"]) {
    await fs.writeFile(note, `---\n${flag}\n---\nWithheld`)
    await assert.rejects(validatePublicContent(root), /Non-public/)
  }
  await fs.writeFile(note, "---\nvisibility: public\n---\n" + "ghp_" + "a".repeat(36))
  await assert.rejects(validatePublicContent(root), /Sensitive content/)
})

test("snapshot rejects hidden/private directories, active content and linked directories", async (t) => {
  for (const name of ["Private", ".obsidian"]) {
    const root = await fixture()
    await fs.mkdir(path.join(root, name))
    await assert.rejects(validatePublicContent(root), /Forbidden content/)
  }
  const root = await fixture()
  await fs.writeFile(path.join(root, "script.html"), "<script></script>")
  await assert.rejects(validatePublicContent(root), /Unapproved content type/)
  const linked = await fixture(),
    outside = await fixture()
  try {
    await fs.symlink(
      outside,
      path.join(linked, "linked"),
      process.platform === "win32" ? "junction" : "dir",
    )
  } catch (e) {
    if (e.code === "EPERM") return t.skip("OS requires symlink privilege")
    throw e
  }
  await assert.rejects(validatePublicContent(linked), /symlink rejected/)
})
