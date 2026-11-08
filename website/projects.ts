import path from "node:path"
import type { Root, RootContent } from "hast"
import type { QuartzPluginData } from "../quartz/plugins/vfile"
import { slugifyFilePath, type FilePath } from "../quartz/util/path"

export interface ShowcaseProject {
  slug: string
  title: string
  description: string
  category: string
  genre: string
  technologies: string[]
  cover: string
  itch: string
  status: string
  featured: boolean
  order: number
}

const text = (node: Root | RootContent | undefined): string => {
  if (!node) return ""
  return node.type === "text"
    ? node.value
    : "children" in node
      ? node.children.map(text).join("")
      : ""
}
const value = (input: unknown): string => {
  if (typeof input !== "string") return ""
  const result = input.trim().replace(/\s+/g, " ")
  return /(?:to be (?:confirmed|documented)|unconfirmed|unknown|not confirmed|tbd|n\/a|\[\[|<[^>]*>)/i.test(
    result,
  )
    ? ""
    : result
}
const list = (input: unknown): string[] =>
  (Array.isArray(input) ? input : typeof input === "string" ? input.split(",") : [])
    .map(value)
    .filter(Boolean)
const unsafePath = (input: string): boolean => {
  try {
    return decodeURIComponent(input)
      .replaceAll("\\", "/")
      .split("/")
      .some((part) => part.startsWith(".") || /^(private|templates)$/i.test(part))
  } catch {
    return true
  }
}

function overview(file: QuartzPluginData): string {
  const nodes = file.htmlAst?.children ?? []
  const start = nodes.findIndex(
    (n) =>
      n.type === "element" &&
      /^h[23]$/.test(n.tagName) &&
      /^(?:project |game )?overview$/i.test(text(n).trim()),
  )
  if (start < 0) return ""
  for (const node of nodes.slice(start + 1)) {
    if (node.type !== "element") continue
    if (/^h[1-3]$/.test(node.tagName)) break
    if (node.tagName === "p") return value(text(node))
  }
  return ""
}

function descendants(root: Root | RootContent | undefined): RootContent[] {
  if (!root || !("children" in root)) return []
  return root.children.flatMap((n) => [n, ...descendants(n)])
}

function itchLink(input: unknown): string {
  if (typeof input !== "string") return ""
  try {
    const url = new URL(input)
    return url.protocol === "https:" &&
      /^(?:[a-z0-9-]+\.)?itch\.io$/i.test(url.hostname) &&
      !url.username &&
      !url.password
      ? url.href
      : ""
  } catch {
    return ""
  }
}

// Only approved raster files already in Quartz's content inputs can become covers.
function coverImage(file: QuartzPluginData, assets: string[]): string {
  const available = assets
    .map((source) => source.replaceAll("\\", "/").replace(/^content\//, ""))
    .filter(
      (source) =>
        source.startsWith("brain/") &&
        !unsafePath(source) &&
        /\.(png|jpe?g|webp|gif|avif)$/i.test(source),
    )
    .map((source) => ({ source, slug: String(slugifyFilePath(source as FilePath)) }))
  const fm = file.frontmatter as Record<string, unknown>
  const images = descendants(file.htmlAst).filter(
    (n) => n.type === "element" && n.tagName === "img",
  )
  const candidates: { raw: unknown; rendered: boolean }[] = [
    { raw: fm.cover, rendered: false },
    { raw: fm["cover-image"], rendered: false },
    ...images.map((n) => ({ raw: n.type === "element" ? n.properties.src : "", rendered: true })),
  ]
  for (const { raw, rendered } of candidates) {
    if (typeof raw !== "string") continue
    let target = raw.trim()
    const md = target.match(/^!?\[[^\]]*\]\(([^)]+)\)$/)
    const wiki = target.match(/^!?\[\[([^\]|]+)(?:\|[^\]]*)?\]\]$/)
    target = md?.[1] ?? wiki?.[1] ?? target
    try {
      target = decodeURIComponent(target)
    } catch {
      continue
    }
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(target) || target.includes("#") || target.includes("?"))
      continue
    const sourcePath = String(file.filePath ?? file.slug)
      .replaceAll("\\", "/")
      .replace(/^content\//, "")
    const normalized = rendered
      ? new URL(target, "https://portfolio.local/" + file.slug).pathname.slice(1)
      : path.posix.normalize(target.replace(/^\/?Public\//i, "brain/").replace(/^\//, ""))
    const relative = path.posix.normalize(path.posix.join(path.posix.dirname(sourcePath), target))
    const direct = available.find(
      (a) => a.source === normalized || a.source === relative || a.slug === normalized,
    )
    const byName = !target.includes("/")
      ? available.filter((a) => path.posix.basename(a.source) === target)
      : []
    const match = direct ?? (byName.length === 1 ? byName[0] : undefined)
    if (match) return match.slug
  }
  return ""
}

export function discoverProjects(
  files: QuartzPluginData[],
  assets: string[] = [],
): ShowcaseProject[] {
  const result = new Map<string, ShowcaseProject>()
  for (const file of files) {
    const slug = String(file.slug ?? "")
    const fm = file.frontmatter as Record<string, unknown> | undefined
    if (!/^brain\/Projects\//i.test(slug) || slug.endsWith("/index") || unsafePath(slug) || !fm)
      continue
    if (fm.type !== "project" || fm.visibility !== "public") continue
    if (
      fm.draft === true ||
      fm.published === false ||
      ["draft", "unpublished"].includes(String(fm.status)) ||
      String(fm.publish).toLowerCase() === "false" ||
      fm.unlisted === true ||
      fm.password ||
      fm.encrypted === true
    )
      continue
    if (fm.visibility !== undefined && String(fm.visibility).toLowerCase() !== "public") continue
    const nodes = descendants(file.htmlAst)
    const title =
      value(fm.title) ||
      value(text(nodes.find((n) => n.type === "element" && n.tagName === "h1"))) ||
      slug.split("/").at(-1)!.replaceAll("-", " ")
    const category = value(fm.category) || value(fm["project-type"]) || "Uncategorized"
    const technologies = [...list(fm.engine), ...list(fm.technologies)]
    // Read explicit technology labels, never infer a tool from an incidental mention.
    for (const node of file.htmlAst?.children ?? []) {
      if (node.type !== "element" || node.tagName !== "p") continue
      const paragraph = text(node)
      for (const match of paragraph.matchAll(
        /(?:^|\.\s+)(Technologies|Tool\/library|Language|Engine):\s*([^.!\n]+)(?:\.|$)/gi,
      )) {
        if (match[1].toLowerCase() !== "engine" || !value(fm.engine))
          technologies.push(...list(match[2]))
      }
    }
    const links = fm.links as Record<string, unknown> | undefined
    const explicitItch = [
      links?.game,
      links?.play,
      fm["itch-url"],
      fm["itch-io"],
      fm["official-url"],
    ]
      .map(itchLink)
      .find(Boolean)
    let game = ""
    try {
      const url = new URL(String(links?.game ?? links?.play ?? ""))
      if (url.protocol === "https:" && !url.username && !url.password) game = url.href
    } catch {}
    const itch =
      game ||
      explicitItch ||
      nodes
        .map((n) => (n.type === "element" && n.tagName === "a" ? itchLink(n.properties.href) : ""))
        .find(Boolean) ||
      ""
    const sortOrder = fm.featured_order ?? fm.order
    const order =
      typeof sortOrder === "number" || (typeof sortOrder === "string" && sortOrder.trim())
        ? Number(sortOrder)
        : NaN
    result.set(slug, {
      slug,
      title,
      category: category.replace(/\b\p{L}/gu, (c) => c.toUpperCase()),
      description: (value(fm.summary) || value(fm.description) || overview(file)).slice(0, 260),
      genre: list(fm.genre).join(" / "),
      technologies: [...new Map(technologies.map((t) => [t.toLowerCase(), t])).values()],
      cover: coverImage(file, assets),
      itch,
      status: value(fm.status),
      featured: fm.featured === true,
      order: Number.isFinite(order) ? order : Number.POSITIVE_INFINITY,
    })
  }
  return [...result.values()].sort(
    (a, b) =>
      Number(b.featured) - Number(a.featured) ||
      a.order - b.order ||
      a.title.localeCompare(b.title, "en", { sensitivity: "base" }) ||
      a.slug.localeCompare(b.slug),
  )
}
