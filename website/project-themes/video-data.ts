import configuration from "../project-media.json"
import generated from "../project-video-posters.json"
import { approvedMedia, publicMediaUrl, type ProjectThemeProps } from "./media"

export interface VideoMetadata {
  src: string
  poster?: string
  title?: string
  description?: string
  category?: string
  display_mode?: string
  autoplay_preview?: boolean
  loop?: boolean
  start?: number
  end?: number
  poster_time?: number
}
export interface ShowcaseVideo {
  src: string
  poster: string
  title: string
  description: string
  category: string
  displayMode: string
  autoplayPreview: boolean
  loop: boolean
  start: number
  end?: number
  width: number
  height: number
  duration?: number
  bytes?: number
}
type Poster = {
  poster: string
  width: number
  height: number
  duration: number
  bytes: number
  sourceHash: string
}
const text = (v: unknown) => (typeof v === "string" ? v : "")
export function projectVideos(props: ProjectThemeProps): ShowcaseVideo[] {
  const fm = props.fileData.frontmatter as Record<string, unknown>
  const config = (configuration as Record<string, { videos?: VideoMetadata[] }>)[
    text(fm.project_id)
  ]
  const supplied = (Array.isArray(fm.videos) ? fm.videos : []).filter(
    (v): v is VideoMetadata => Boolean(v) && typeof v === "object" && typeof v.src === "string",
  )
  const metadata = [...(config?.videos ?? []), ...supplied]
  const discovered = approvedMedia(props).videos
  const sources = new Map(metadata.map((v) => [publicMediaUrl(props, v.src), v.src]))
  const posters = generated as Record<string, Poster>
  for (const raw of Object.keys(posters)) {
    const url = publicMediaUrl(props, raw)
    if (url && !sources.has(url)) sources.set(url, raw)
  }
  const result: ShowcaseVideo[] = []
  const make = (src: string, entry?: VideoMetadata, index = 0): ShowcaseVideo => {
    const raw = entry?.src ?? sources.get(src) ?? ""
    const range =
      typeof entry?.start === "number"
        ? "#t=" + entry.start + (entry.end ? "," + entry.end : "")
        : ""
    const information = posters[raw + range] || posters[raw]
    const poster =
      publicMediaUrl(props, entry?.poster, true) ||
      publicMediaUrl(props, (range ? posters[raw + range] : information)?.poster, true)
    const start =
      typeof entry?.start === "number" && Number.isFinite(entry.start) && entry.start >= 0
        ? entry.start
        : 0
    const end =
      typeof entry?.end === "number" && Number.isFinite(entry.end) && entry.end > start
        ? entry.end
        : undefined
    return {
      src,
      poster,
      title: text(entry?.title) || `Gameplay clip ${index + 1}`,
      description: text(entry?.description),
      category: text(entry?.category) || "gameplay",
      displayMode: text(entry?.display_mode) || "playlist",
      autoplayPreview: entry?.autoplay_preview === true,
      loop: entry?.loop === true,
      start,
      end,
      width: information?.width || 16,
      height: information?.height || 9,
      duration: end ? end - start : information?.duration,
      bytes: information?.bytes,
    }
  }
  for (const [index, src] of discovered.entries()) {
    const entry = metadata
      .filter((v) => publicMediaUrl(props, v.src) === src && v.display_mode !== "contribution")
      .at(-1)
    if (
      !entry &&
      metadata.some(
        (v) => publicMediaUrl(props, v.src) === src && v.display_mode === "contribution",
      )
    )
      continue
    result.push(make(src, entry, index))
  }
  for (const entry of metadata.filter((v) => v.display_mode === "contribution")) {
    const src = publicMediaUrl(props, entry.src)
    if (src && discovered.includes(src)) result.push(make(src, entry))
  }
  return result.sort(
    (a, b) => Number(b.displayMode === "featured") - Number(a.displayMode === "featured"),
  )
}
export function projectArtwork(props: ProjectThemeProps) {
  const fm = props.fileData.frontmatter as Record<string, unknown>
  const config = (
    configuration as Record<
      string,
      { artwork?: { src: string; title: string; category: string }[] }
    >
  )[text(fm.project_id)]
  return (config?.artwork ?? [])
    .map((v) => ({ ...v, src: publicMediaUrl(props, v.src) }))
    .filter((v) => v.src)
}
