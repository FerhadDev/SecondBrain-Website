import type { QuartzComponentProps } from "../../quartz/components/types"
import { slugifyFilePath, type FilePath } from "../../quartz/util/path"

export type ProjectThemeProps = QuartzComponentProps & { root: string }

// Resolve only synchronized public inputs. The theme never reads the vault or arbitrary paths.
export function approvedMedia(props: ProjectThemeProps) {
  const fm = props.fileData.frontmatter as Record<string, unknown>
  const available = new Set(
    props.ctx.allFiles.map((p) => p.replaceAll("\\", "/").replace(/^content\//, "")),
  )
  const resolve = (raw: unknown): string => {
    if (
      typeof raw !== "string" ||
      !/^brain\//.test(raw) ||
      !/\.(png|jpe?g|webp|gif|mp4|webm)$/i.test(raw)
    )
      return ""
    let decoded: string
    try {
      decoded = decodeURIComponent(raw)
    } catch {
      return ""
    }
    if (
      decoded.split(/[\\/]/).some((p) => p.startsWith(".") || /^(private|templates)$/i.test(p)) ||
      !available.has(raw)
    )
      return ""
    return `${props.root}/${String(slugifyFilePath(raw as FilePath))
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`
  }
  const list = (key: string) =>
    (Array.isArray(fm[key]) ? (fm[key] as unknown[]) : [])
      .map((v) => resolve(v && typeof v === "object" && "src" in v ? v.src : v))
      .filter(Boolean)
  const images = list("screenshots").filter((p) => /\.(png|jpe?g|webp|gif)$/i.test(p))
  const videos = list("videos").filter((p) => /\.(mp4|webm)$/i.test(p))
  const walk = (node: any) => {
    if (
      node?.type === "element" &&
      ["img", "video", "source"].includes(node.tagName) &&
      typeof node.properties?.src === "string"
    ) {
      try {
        const rendered = new URL(
          node.properties.src,
          "https://portfolio.local/" + props.fileData.slug,
        ).pathname.slice(1)
        const source = [...available].find(
          (p) => String(slugifyFilePath(p as FilePath)) === decodeURIComponent(rendered),
        )
        const url = resolve(source)
        if (url && /\.(png|jpe?g|webp|gif)$/i.test(url) && !images.includes(url)) images.push(url)
        if (url && /\.(mp4|webm)$/i.test(url) && !videos.includes(url)) videos.push(url)
      } catch {}
    }
    for (const child of node?.children ?? []) walk(child)
  }
  walk(props.fileData.htmlAst)
  const cover = resolve(fm.cover)
  return {
    images,
    videos,
    cover: /\.(png|jpe?g|webp|gif)$/i.test(cover) ? cover : "",
  }
}

// The second namespace contains only repository-generated posters derived from approved video inputs.
export function publicMediaUrl(props: ProjectThemeProps, raw: unknown, poster = false): string {
  if (
    typeof raw !== "string" ||
    !(raw.startsWith("brain/") || (poster && raw.startsWith("project-media/posters/")))
  )
    return ""
  if (poster && !/\.(png|jpe?g|webp|gif)$/i.test(raw)) return ""
  let decoded: string
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    return ""
  }
  if (
    decoded.split(/[\\/]/).some((p) => p.startsWith(".") || /^(private|templates)$/i.test(p)) ||
    /[?#]/.test(raw) ||
    !/\.(png|jpe?g|webp|gif|mp4|webm)$/i.test(raw)
  )
    return ""
  const available = props.ctx.allFiles.map((p) => p.replaceAll("\\", "/").replace(/^content\//, ""))
  if (!available.includes(raw)) return ""
  return `${props.root}/${String(slugifyFilePath(raw as FilePath))
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`
}
