import type { ShowcaseVideo } from "./project-themes/video-data"
export const videoTime = (seconds?: number) =>
  typeof seconds === "number" && Number.isFinite(seconds)
    ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`
    : ""
export function VideoThumbnail({
  video,
  index,
  active,
}: {
  video: ShowcaseVideo
  index: number
  active: boolean
}) {
  return (
    <button
      type="button"
      class={`video-preview ${active ? "is-active" : ""}`}
      data-video-select={index}
      data-video-item={JSON.stringify(video)}
      aria-pressed={active}
      aria-label={`Select ${video.title}`}
    >
      <span class="video-preview-image">
        {video.poster ? (
          <img src={video.poster} alt="" loading="lazy" decoding="async" />
        ) : (
          <span class="video-poster-fallback" data-thumbnail-fallback>
            <span aria-hidden="true">&#9655;</span>
            <small>Video recording</small>
          </span>
        )}
        <span class="video-preview-duration">{videoTime(video.duration)}</span>
        <span class="video-preview-state" data-video-preview-state>
          {active ? "Selected" : "Play clip"}
        </span>
      </span>
      <span class="video-preview-copy">
        <strong>{video.title}</strong>
        <span>{video.description || "Original project recording"}</span>
      </span>
    </button>
  )
}
export function FeaturedVideoPlayer({
  videos,
  id,
  label,
  compact = false,
}: {
  videos: ShowcaseVideo[]
  id: string
  label: string
  compact?: boolean
}) {
  const first = videos[0]
  if (!first) return null
  return (
    <section
      class={`featured-video-gallery ${compact ? "featured-video-compact" : ""}`}
      data-featured-video-gallery
      id={id}
      aria-label={label}
    >
      <div class="featured-video-main">
        <div class="featured-video-top">
          <span>{label}</span>
          <span data-video-position>01 / {String(videos.length).padStart(2, "0")}</span>
        </div>
        <div
          class="featured-video-stage"
          style={{ aspectRatio: `${first.width} / ${first.height}` }}
          data-video-stage
        >
          <video
            controls
            playsInline
            muted
            loop={first.loop}
            preload="none"
            poster={first.poster || undefined}
            aria-label={first.title}
            data-featured-video
            data-initial-src={first.src}
            data-initial-start={first.start}
            data-initial-end={first.end}
          />
          <button
            type="button"
            class="featured-video-start"
            data-video-start
            aria-label={`Play ${first.title}`}
          >
            <span aria-hidden="true">&#9654;</span>
            <small>Play recording</small>
          </button>
          <span class="featured-video-duration" data-video-duration>
            {videoTime(first.duration)}
          </span>
        </div>
        <div class="featured-video-caption">
          <div>
            <p class="video-caption-label">NOW SELECTED</p>
            <h3 data-video-title>{first.title}</h3>
            <p data-video-description>{first.description}</p>
          </div>
          <button type="button" data-video-fullscreen aria-label={`Fullscreen ${first.title}`}>
            Fullscreen &#8599;
          </button>
        </div>
        <p class="video-playback-status" role="status" aria-live="polite" data-video-status>
          Press play to begin. Sound starts muted.
        </p>
      </div>
      <div class="video-playlist" data-video-playlist aria-label="Select a recording">
        {videos.map((video, index) => (
          <VideoThumbnail
            key={`${video.src}-${video.start}`}
            video={video}
            index={index}
            active={index === 0}
          />
        ))}
      </div>
      <noscript>
        <p>JavaScript enables this player. Original recordings:</p>
        <ul>
          {videos.map((video) => (
            <li>
              <a
                href={`${video.src}${video.start ? `#t=${video.start}${video.end ? "," + video.end : ""}` : ""}`}
              >
                {video.title}
              </a>
            </li>
          ))}
        </ul>
      </noscript>
    </section>
  )
}
