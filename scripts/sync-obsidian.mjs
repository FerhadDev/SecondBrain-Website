import { reconcileVideoPosters } from "./video-posters.mjs"
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { unified } from "unified"
import remarkParse from "remark-parse"
import { visit } from "unist-util-visit"
import { stringify } from "yaml"
import {
  frontmatter,
  unpublished,
  validateProject,
  safeUrl,
  validateVideoMetadata,
} from "./project-schema.mjs"

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const approved = "D:\\SecondBrain\\Public"
const assets = new Set([
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
const forbidden = (p) =>
  p.split(/[\\/]/).some((s) => s.startsWith(".") || /^(private|templates)$/i.test(s))
const inside = (root, p) =>
  p === root ||
  (!path.relative(root, p).startsWith("..") && !path.isAbsolute(path.relative(root, p)))
async function noLinks(p) {
  for (let part = path.resolve(p); ;) {
    let stat
    try {
      stat = await fs.lstat(part)
    } catch (e) {
      if (e.code !== "ENOENT") throw e
    }
    if (stat?.isSymbolicLink()) throw new Error("Symbolic link or junction rejected")
    const parent = path.dirname(part)
    if (parent === part) break
    part = parent
  }
}

// Options are for isolated fixture tests; the CLI always uses the approved Public root.
export async function sync({
  source = approved,
  destination = path.join(repo, "content/brain"),
  reportPath = path.join(repo, ".obsidian-sync/report.json"),
  projectMetadata,
} = {}) {
  source = path.resolve(source)
  destination = path.resolve(destination)
  if (inside(source, destination) || inside(destination, source))
    throw new Error("Source and destination overlap")
  await noLinks(source)
  // Optional legacy metadata supplements never create notes or override source publication flags.
  projectMetadata ??= JSON.parse(
    (await fs.readFile(path.join(repo, "website/public-project-metadata.json"), "utf8")).replace(
      /^\uFEFF/,
      "",
    ),
  )
  const supplementFields = new Set(
    "project_id title type visibility category genre engine role status studio description cover featured featured_order".split(
      " ",
    ),
  )
  for (const [rel, metadata] of Object.entries(projectMetadata)) {
    if (
      !rel.startsWith("Projects/") ||
      forbidden(rel) ||
      rel.includes("\\") ||
      path.posix.normalize(rel) !== rel ||
      !rel.endsWith(".md") ||
      !metadata ||
      typeof metadata !== "object" ||
      Array.isArray(metadata) ||
      Object.keys(metadata).some((key) => !supplementFields.has(key)) ||
      metadata.visibility !== "public" ||
      validateProject(metadata).length
    )
      throw new Error("Invalid public project metadata supplement")
  }
  const files = new Map(),
    excluded = [],
    issues = []
  async function walk(dir, prefix = "") {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const rel = prefix + entry.name,
        full = path.join(dir, entry.name)
      const stat = await fs.lstat(full)
      if (forbidden(rel) || stat.isSymbolicLink()) {
        excluded.push({ file: rel, reason: "Forbidden name or symbolic link" })
        continue
      }
      if (!inside(source, full)) throw new Error("Source escape rejected")
      if (stat.isDirectory()) await walk(full, rel + "/")
      else if (
        stat.isFile() &&
        (path.extname(rel).toLowerCase() === ".md" || assets.has(path.extname(rel).toLowerCase()))
      )
        files.set(rel, await fs.readFile(full))
      else excluded.push({ file: rel, reason: "Unapproved file type" })
    }
  }
  await walk(source)
  for (const [rel, bytes] of files) {
    if (!/\.md$/i.test(rel)) continue
    try {
      const { data, body } = frontmatter(bytes.toString("utf8"))
      if (unpublished(data)) {
        files.delete(rel)
        excluded.push({ file: rel, reason: "Not published" })
        continue
      }
      const merged = { ...(projectMetadata[rel] ?? {}), ...data }
      if (projectMetadata[rel])
        files.set(rel, Buffer.from("---\n" + stringify(merged) + "---\n" + body))
      if (/^Projects\//i.test(rel))
        for (const reason of validateProject(merged)) issues.push({ file: rel, reason })
    } catch {
      files.delete(rel)
      excluded.push({ file: rel, reason: "Invalid frontmatter" })
    }
  }
  const resolve = (target, from, available) => {
    let value
    try {
      value = decodeURIComponent(target).replaceAll("\\", "/")
    } catch {
      return null
    }
    value = value.split(/[?#]/)[0]
    if (!value) return from
    value = value.replace(/^\/?Public\//i, "").replace(/^brain\//i, "")
    if (
      value.split("/").some((s) => s !== "." && s !== ".." && forbidden(s)) ||
      value.startsWith("/") ||
      /^[a-z]+:/i.test(value)
    )
      return null
    const candidates = [
      path.posix.normalize(path.posix.join(path.posix.dirname(from), value)),
      path.posix.normalize(value),
    ]
    for (const candidate of candidates)
      for (const suffix of ["", ".md"])
        if (available.has(candidate + suffix)) return candidate + suffix
    const matches = [...available.keys()].filter(
      (f) =>
        f === value ||
        f.endsWith("/" + value) ||
        f === value + ".md" ||
        f.endsWith("/" + value + ".md"),
    )
    return matches.length === 1 ? matches[0] : null
  }
  let available = new Map(files),
    output
  // Repeat when excluded notes invalidate links from other notes.
  for (;;) {
    output = new Map()
    const rejected = []
    for (const [rel, data] of available) {
      if (!rel.toLowerCase().endsWith(".md")) {
        output.set(rel, data)
        continue
      }
      let body = data.toString("utf8")
      const parsed = frontmatter(body)
      const allowed = new Set(
        "project_id title type visibility status category featured featured_order description genre role platform technologies cover screenshots videos links engine engine-version project-type studio event duration style tags summary order itch-url itch-io official-url aliases".split(
          " ",
        ),
      )
      const fm = Object.fromEntries(Object.entries(parsed.data).filter(([key]) => allowed.has(key)))
      for (const key of ["cover", "screenshots", "videos"]) {
        if (fm[key] === undefined) continue
        const values = Array.isArray(fm[key]) ? fm[key] : [fm[key]],
          valid = []
        for (const raw of values) {
          const videoObject =
            key === "videos" && raw && typeof raw === "object" && !Array.isArray(raw)
          if (videoObject && validateVideoMetadata(raw).length) {
            issues.push({ file: rel, reason: "Invalid video metadata omitted" })
            continue
          }
          const input = videoObject ? raw.src : raw
          const found = typeof input === "string" ? resolve(input, rel, available) : null
          const ext = found ? path.extname(found).toLowerCase() : ""
          const approvedMedia =
            key === "videos" ? [".mp4", ".webm"] : [".png", ".jpg", ".jpeg", ".webp", ".gif"]
          if (found && approvedMedia.includes(ext)) {
            if (videoObject) {
              const item = { ...raw, src: "brain/" + found }
              if (item.poster !== undefined) {
                const poster = resolve(item.poster, rel, available)
                if (poster && /\.(png|jpe?g|webp|gif)$/i.test(poster))
                  item.poster = "brain/" + poster
                else {
                  delete item.poster
                  issues.push({ file: rel, reason: "Unavailable video poster omitted" })
                }
              }
              valid.push(item)
            } else valid.push("brain/" + found)
          } else issues.push({ file: rel, reason: key + ": unavailable or unsafe media omitted" })
        }
        if (key === "cover") {
          if (valid.length) fm[key] = valid[0]
          else delete fm[key]
        } else fm[key] = valid
      }
      if (fm.links && typeof fm.links === "object")
        fm.links = Object.fromEntries(Object.entries(fm.links).filter(([, url]) => safeUrl(url)))
      for (const key of ["itch-url", "itch-io", "official-url"])
        if (fm[key] && !safeUrl(fm[key])) delete fm[key]
      for (const key of Object.keys(fm))
        if (
          /(?:private|templates|\.obsidian|file:|obsidian:|\.\.[\\/]|\[\[)/i.test(
            JSON.stringify(fm[key]),
          )
        )
          delete fm[key]
      body = "---\n" + stringify(fm) + "---\n" + parsed.body
      if (/^Projects\//i.test(rel))
        body = body.replace(
          /(^## [^\n]+\n)([\s\S]*?)(?=^## |$(?![\s\S]))/gm,
          (whole, heading, content) => {
            const retained = content
              .split("\n")
              .filter(
                (line) =>
                  !/(?:to be (?:confirmed|documented)|not yet attached|no media paths)/i.test(line),
              )
            // Blank lines separate lists and paragraphs; keep them in the sanitized Markdown.
            const meaningful = retained.some((line) => line.trim())
            return meaningful ? heading + retained.join("\n").trimEnd() + "\n\n" : ""
          },
        )
      body = body.replace(/!?\[\[([^\]\r\n]+)\]\]/g, (whole, inner) => {
        const target = inner.split("|")[0],
          found = resolve(target, rel, available)
        if (!found) {
          issues.push({
            file: rel,
            target,
            reason: "Unresolved wikilink removed (target and alias)",
          })
          return "Unavailable public reference"
        }
        const fragment = target.includes("#") ? "#" + target.split("#").slice(1).join("#") : ""
        const relative = path.posix.relative(path.posix.dirname(rel), found)
        const label = (inner.split("|")[1] || path.posix.basename(found, ".md")).replace(
          /[\[\]\\]/g,
          "",
        )
        return `${whole.startsWith("!") ? "!" : ""}[${label}](${relative.split("/").map(encodeURIComponent).join("/")}${encodeURI(fragment)})`
      })
      let unsafe = false
      const metadata = body.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/)?.[0] || ""
      const tree = unified().use(remarkParse).parse(body.slice(metadata.length))
      const edits = []
      visit(tree, (node) => {
        if (node.type === "html") {
          unsafe = true
          issues.push({ file: rel, reason: "Raw HTML requires review" })
        }
        if (["link", "image", "definition"].includes(node.type)) {
          if (/^(https?:|mailto:)/i.test(node.url)) return
          const found = resolve(node.url, rel, available)
          if (!found) {
            unsafe = true
            issues.push({
              file: rel,
              target: node.url,
              reason: "Unsafe or missing Markdown target",
            })
          } else if (!node.url.startsWith("#")) {
            // Quartz's shortest resolver expects paths from the content root.
            const url =
              ("brain/" + found).split("/").map(encodeURIComponent).join("/") +
              (node.url.match(/[?#].*$/)?.[0] || "")
            const start = metadata.length + node.position.start.offset,
              end = metadata.length + node.position.end.offset
            const original = body.slice(start, end)
            // Rewrite only the explicit destination; unusual escaping is excluded for review.
            const at = original.lastIndexOf(node.url)
            if (at < 0) unsafe = true
            else edits.push({ start: start + at, end: start + at + node.url.length, value: url })
          }
        }
      })
      if (/\[\[|\]\]/.test(body)) unsafe = true
      // Frontmatter can generate redirects, graph entries, and additional URLs.
      const front = body.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
      if (front && /(?:private|templates|\.obsidian|file:|obsidian:|\.\.\/)/i.test(front[1]))
        unsafe = true
      for (const edit of edits.sort((a, b) => b.start - a.start))
        body = body.slice(0, edit.start) + edit.value + body.slice(edit.end)
      if (unsafe) rejected.push(rel)
      // Normalize only EOF blank lines; retain interior Markdown and hard-break spaces.
      else output.set(rel, Buffer.from(body.replace(/(?:\r?\n[ \t]*)+$/, "") + "\n"))
    }
    if (!rejected.length) break
    for (const rel of rejected) {
      available.delete(rel)
      excluded.push({ file: rel, reason: "Unsafe link or markup requires review" })
    }
  }
  // This dedicated directory is the only content the synchronizer may delete.
  await fs.mkdir(path.dirname(destination), { recursive: true })
  await noLinks(path.dirname(destination))
  try {
    await noLinks(destination)
  } catch (e) {
    if (e.code !== "ENOENT") throw e
  }
  await fs.mkdir(destination, { recursive: true })
  let owned = []
  try {
    owned = JSON.parse(await fs.readFile(reportPath, "utf8")).synchronized ?? []
  } catch (e) {
    if (e.code !== "ENOENT") throw e
  }
  for (const rel of owned) {
    if (typeof rel !== "string" || !inside(destination, path.resolve(destination, rel)))
      throw new Error("Invalid ownership path")
    const full = path.join(destination, rel)
    try {
      await noLinks(full)
      if (!output.has(rel)) await fs.unlink(full)
    } catch (e) {
      if (e.code !== "ENOENT") throw e
    }
  }
  for (const rel of output.keys()) {
    const full = path.join(destination, rel)
    try {
      await noLinks(full)
      if (!owned.includes(rel) && !(await fs.readFile(full)).equals(output.get(rel)))
        throw new Error("Unmanaged destination collision: " + rel)
    } catch (e) {
      if (e.code !== "ENOENT") throw e
    }
  }
  for (const [rel, bytes] of output) {
    const full = path.join(destination, rel)
    await fs.mkdir(path.dirname(full), { recursive: true })
    let old
    try {
      old = await fs.readFile(full)
    } catch (e) {
      if (e.code !== "ENOENT") throw e
    }
    if (!old?.equals(bytes)) await fs.writeFile(full, bytes)
  }
  if (source === path.resolve(approved) && destination === path.join(repo, "content/brain"))
    await reconcileVideoPosters({
      contentRoot: path.join(repo, "content"),
      manifestPath: path.join(repo, "website/project-video-posters.json"),
      available: output,
    })
  const report = {
    synchronized: [...output.keys()].sort(),
    excluded,
    issues: [...new Map(issues.map((i) => [JSON.stringify(i), i])).values()],
  }
  await fs.mkdir(path.dirname(reportPath), { recursive: true })
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + "\n")
  return report
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await sync()
  console.log(
    `Synchronized ${result.synchronized.length} files; excluded ${result.excluded.length}; link issues ${result.issues.length}. Local details: .obsidian-sync/report.json`,
  )
}
