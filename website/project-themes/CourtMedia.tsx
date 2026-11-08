import { approvedMedia, type ProjectThemeProps } from "./media"

export function ProjectVideo({
  src,
  preview = false,
  poster,
  loop,
}: {
  src: string
  preview?: boolean
  poster?: string
  loop?: boolean
}) {
  return (
    <video
      src={src}
      controls
      muted
      playsInline
      poster={poster}
      loop={loop ?? preview}
      preload="metadata"
      data-project-video
      data-project-preview={preview ? "true" : undefined}
    />
  )
}

// Native disclosure preserves full artwork and supports keyboard access without JavaScript.
export function CourtGallery({
  images,
  label,
}: {
  images: { src: string; caption: string }[]
  label: string
}) {
  return (
    <div class="court-gallery" aria-label={label}>
      {images.map(({ src, caption }) => (
        <details class="court-gallery-item" key={src}>
          <summary>
            <img src={src} alt={caption} loading="lazy" decoding="async" />
            <span>
              {caption}
              <span aria-hidden="true">View full size +</span>
            </span>
          </summary>
          <a href={src} target="_blank" rel="noopener noreferrer">
            <img src={src} alt={caption} loading="lazy" />
            Open original artwork &#8599;
          </a>
        </details>
      ))}
    </div>
  )
}
export function CourtMedia({ media }: { media: ReturnType<typeof approvedMedia> }) {
  const captions = [
    "Official title artwork",
    "An audience in the royal court",
    "The court and parchment dialogue",
    "A request before the throne",
    "A later court scene",
    "Another moment in the court",
  ]
  return (
    <div>
      <CourtGallery
        label="Gameplay screenshots and animated images"
        images={media.images.map((src, i) => ({
          src,
          caption: captions[i] ?? `Gameplay reference ${i + 1}`,
        }))}
      />
      {media.videos.length > 0 && (
        <div class="court-videos">
          {media.videos.map((src, i) => (
            <figure key={src}>
              <ProjectVideo src={src} />
              <figcaption>Gameplay clip {i + 1}</figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  )
}
export type { ProjectThemeProps }
