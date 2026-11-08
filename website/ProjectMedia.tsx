import type { QuartzComponentProps } from "../quartz/components/types"
import { slugifyFilePath, type FilePath } from "../quartz/util/path"

export function ProjectMedia({ fileData, ctx, root }: QuartzComponentProps & { root: string }) {
  const fm = fileData.frontmatter as Record<string, unknown>
  const available = new Set(
    ctx.allFiles.map((p) => p.replaceAll("\\", "/").replace(/^content\//, "")),
  )
  const media = (key: string, pattern: RegExp) =>
    (Array.isArray(fm[key]) ? (fm[key] as unknown[]) : [])
      .map((input) => (input && typeof input === "object" && "src" in input ? input.src : input))
      .filter(
        (v): v is string =>
          typeof v === "string" &&
          v.startsWith("brain/") &&
          !v.split("/").some((s) => s.startsWith(".") || /^(private|templates)$/i.test(s)) &&
          pattern.test(v) &&
          available.has(v),
      )
  const images = media("screenshots", /\.(png|jpe?g|webp|gif)$/i)
  const videos = media("videos", /\.(mp4|webm)$/i)
  const href = (p: string) =>
    `${root}/${String(slugifyFilePath(p as FilePath))
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`
  if (!images.length && !videos.length) return null
  return (
    <section class="project-media">
      <h2>Media Gallery</h2>
      <div class="project-media-grid">
        {images.map((p, i) => (
          <a href={href(p)}>
            <img src={href(p)} alt={`Project screenshot ${i + 1}`} loading="lazy" />
          </a>
        ))}
        {videos.map((p) => (
          <video controls preload="metadata" src={href(p)} />
        ))}
      </div>
    </section>
  )
}
