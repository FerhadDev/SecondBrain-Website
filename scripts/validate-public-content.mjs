import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { frontmatter, unpublished, validateKnowledgeNote } from "./project-schema.mjs"

const media = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".avif",
  ".ico",
  ".pdf",
  ".mp3",
  ".mp4",
  ".wav",
  ".ogg",
  ".webm",
])
const forbidden = /^(?:private|templates|node_modules|public|coverage|test-results)$/i
const secret =
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9_-]{20,})/

// Read repository content only; never import or invoke vault synchronization.
export async function validatePublicContent(root = "content") {
  let files = 0
  async function walk(dir, prefix = "") {
    if ((await fs.lstat(dir)).isSymbolicLink()) throw new Error("Content symlink rejected")
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const rel = prefix + entry.name
      if (entry.name.startsWith(".") || forbidden.test(entry.name))
        throw new Error(`Forbidden content path: ${rel}`)
      const full = path.join(dir, entry.name)
      const stat = await fs.lstat(full)
      if (stat.isSymbolicLink()) throw new Error(`Content symlink rejected: ${rel}`)
      if (stat.isDirectory()) {
        await walk(full, rel + "/")
        continue
      }
      if (!stat.isFile()) throw new Error(`Unsupported content entry: ${rel}`)
      const ext = path.extname(rel).toLowerCase()
      if (ext !== ".md" && !media.has(ext)) throw new Error(`Unapproved content type: ${rel}`)
      if (ext === ".md") {
        const text = await fs.readFile(full, "utf8")
        const { data } = frontmatter(text)
        if (validateKnowledgeNote(data).length)
          throw new Error(`Invalid knowledge-note metadata: ${rel}`)
        if (unpublished(data) || (rel.startsWith("brain/") && data.visibility !== "public"))
          throw new Error(`Non-public note rejected: ${rel}`)
        if (
          secret.test(text) ||
          /(?:api[_-]?key|client[_-]?secret|access[_-]?token|password)\s*[:=]\s*["'][^"'\r\n]{8,}["']/i.test(
            text,
          ) ||
          /(?:file:|obsidian:)\/\/|[A-Z]:\\|(?:^|[(/])(?:private|\.obsidian)\//im.test(text)
        )
          throw new Error(`Sensitive content pattern: ${rel}`)
      }
      files++
    }
  }
  await walk(root)
  return files
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  console.log(`Validated ${await validatePublicContent()} public content files; no vault access.`)
