import type { ShowcaseVideo } from "./project-themes/video-data"
import { FeaturedVideoPlayer } from "./FeaturedVideoPlayer"
export function ContributionMediaCard({
  id,
  number,
  title,
  text,
  tag,
  videos,
}: {
  id: string
  number: string
  title: string
  text: string
  tag: string
  videos: ShowcaseVideo[]
}) {
  return (
    <article class={`contribution-media-card ${videos.length ? "has-recording" : ""}`}>
      <div class="contribution-media-copy">
        <span class="diary-work-number">{number}</span>
        <p class="diary-kicker">MY CONTRIBUTION</p>
        <h3>{title}</h3>
        <p>{text}</p>
        <span class="diary-work-tag">{tag}</span>
        {!videos.length && (
          <p class="contribution-recording-note">
            A dedicated demonstration has not been supplied.
          </p>
        )}
      </div>
      {videos.length > 0 && (
        <FeaturedVideoPlayer
          videos={videos}
          id={`diary-${id}-recording`}
          label="FROM THE GAMEPLAY RECORDING"
          compact
        />
      )}
    </article>
  )
}
