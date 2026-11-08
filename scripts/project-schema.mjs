import fs from "node:fs/promises"
import path from "node:path"
import { parse } from "yaml"

export function frontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  const data = match ? parse(match[1], { uniqueKeys: true }) : {}
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw new Error("Frontmatter must be a mapping")
  return { data, body: text.slice(match?.[0].length ?? 0) }
}
export const unpublished = (fm) =>
  (fm.visibility !== undefined && fm.visibility !== "public") ||
  fm.draft === true ||
  fm.publish === false ||
  fm.published === false ||
  fm.unlisted === true ||
  fm.encrypted === true ||
  Boolean(fm.password) ||
  ["draft", "unpublished"].includes(fm.status)
export function validateProject(fm) {
  const issues = []
  if (
    fm.project_id !== undefined &&
    (typeof fm.project_id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fm.project_id))
  )
    issues.push("project_id: expected lowercase identifier")
  for (const key of ["title", "type", "visibility"])
    if (typeof fm[key] !== "string" || !fm[key].trim())
      issues.push(`${key}: required nonempty string`)
  if (fm.type !== undefined && fm.type !== "project") issues.push("type: expected project")
  if (fm.visibility !== undefined && !["public", "private", "unlisted"].includes(fm.visibility))
    issues.push("visibility: unsupported value")
  for (const key of ["description", "category", "status", "cover"])
    if (fm[key] !== undefined && typeof fm[key] !== "string") issues.push(`${key}: expected string`)
  for (const key of ["genre", "role", "platform", "technologies"])
    if (
      fm[key] !== undefined &&
      !(
        typeof fm[key] === "string" ||
        (Array.isArray(fm[key]) && fm[key].every((v) => typeof v === "string"))
      )
    )
      issues.push(`${key}: expected string or string list`)
  for (const key of ["screenshots"])
    if (
      fm[key] !== undefined &&
      !(Array.isArray(fm[key]) && fm[key].every((v) => typeof v === "string"))
    )
      issues.push(`${key}: expected string list`)
  if (fm.videos !== undefined) {
    if (!Array.isArray(fm.videos)) issues.push("videos: expected list")
    else
      fm.videos.forEach((video, index) => {
        if (typeof video !== "string")
          for (const issue of validateVideoMetadata(video))
            issues.push(`videos[${index}]: ${issue}`)
      })
  }
  if (fm.featured !== undefined && typeof fm.featured !== "boolean")
    issues.push("featured: expected boolean")
  if (
    fm.featured_order !== undefined &&
    !(typeof fm.featured_order === "number" && Number.isFinite(fm.featured_order))
  )
    issues.push("featured_order: expected finite number")
  if (
    typeof fm.status === "string" &&
    ![
      "active",
      "in-development",
      "prototype",
      "released",
      "completed",
      "paused",
      "stopped",
      "discontinued",
      "archived",
      "draft",
      "unpublished",
    ].includes(fm.status)
  )
    issues.push("status: unsupported value")
  if (
    fm.links !== undefined &&
    (!fm.links ||
      typeof fm.links !== "object" ||
      Array.isArray(fm.links) ||
      Object.values(fm.links).some((v) => !safeUrl(v)))
  )
    issues.push("links: expected mapping of labels to HTTPS URLs")
  return issues
}
export function safeUrl(value) {
  try {
    const u = new URL(value)
    return typeof value === "string" && u.protocol === "https:" && !u.username && !u.password
  } catch {
    return false
  }
}
export async function validateDirectory(root) {
  const results = [],
    titles = new Map()
  async function walk(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isSymbolicLink()) continue
      if (entry.isDirectory()) await walk(full)
      else if (/\.md$/i.test(entry.name)) {
        const file = path.relative(root, full).replaceAll("\\", "/")
        if (!/^Projects\//i.test(file)) continue
        try {
          const { data } = frontmatter(await fs.readFile(full, "utf8"))
          const issues = validateProject(data)
          const title = typeof data.title === "string" ? data.title.toLowerCase() : ""
          if (title && titles.has(title)) issues.push(`duplicate title (routes remain distinct)`)
          if (title) titles.set(title, file)
          results.push({ file, issues })
        } catch {
          results.push({ file, issues: ["Invalid YAML frontmatter"] })
        }
      }
    }
  }
  await walk(root)
  return results
}

export function validateVideoMetadata(video) {
  if (!video || typeof video !== "object" || Array.isArray(video))
    return ["expected path string or video mapping"]
  const issues = [],
    allowed = new Set(
      "src poster title description category display_mode autoplay_preview loop start end poster_time".split(
        " ",
      ),
    )
  if (typeof video.src !== "string" || !video.src.trim()) issues.push("src is required")
  for (const key of Object.keys(video))
    if (!allowed.has(key)) issues.push("unsupported field: " + key)
  for (const key of ["poster", "title", "description", "category"])
    if (video[key] !== undefined && typeof video[key] !== "string")
      issues.push(key + ": expected string")
  if (
    video.display_mode !== undefined &&
    !["featured", "playlist", "contribution", "decorative"].includes(video.display_mode)
  )
    issues.push("display_mode: unsupported value")
  for (const key of ["autoplay_preview", "loop"])
    if (video[key] !== undefined && typeof video[key] !== "boolean")
      issues.push(key + ": expected boolean")
  for (const key of ["start", "end", "poster_time"])
    if (
      video[key] !== undefined &&
      !(typeof video[key] === "number" && Number.isFinite(video[key]) && video[key] >= 0)
    )
      issues.push(key + ": expected nonnegative finite number")
  if (typeof video.end === "number" && video.end <= (video.start ?? 0))
    issues.push("end must be after start")
  return issues
}
