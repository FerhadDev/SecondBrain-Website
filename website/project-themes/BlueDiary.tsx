import { FeaturedVideoPlayer } from "../FeaturedVideoPlayer"
import { ContributionMediaCard } from "../ContributionMediaCard"
import { ProjectVideo } from "./CourtMedia"
import { projectVideos, projectArtwork } from "./video-data"
import { approvedMedia, type ProjectThemeProps } from "./media"

function Chapter({ number, label }: { number: string; label: string }) {
  return (
    <p class="diary-kicker">
      <span>{number}</span> {label}
    </p>
  )
}
function Artwork({ src, alt, label }: { src?: string; alt: string; label: string }) {
  return src ? (
    <img src={src} alt={alt} loading="lazy" decoding="async" />
  ) : (
    <div class="diary-art-pending">
      <span aria-hidden="true">+</span>
      <p>{label}</p>
      <small>Artwork not yet supplied</small>
    </div>
  )
}

export function BlueDiary(props: ProjectThemeProps) {
  const media = approvedMedia(props)
  const videos = projectVideos(props)
  const playlist = videos.filter(
    (video) => !["contribution", "decorative"].includes(video.displayMode),
  )
  const artwork = projectArtwork(props)
  const artImages = artwork.length ? artwork.map((item) => item.src) : media.images
  // Note image order: concept page, shared animation spread, gameplay still.
  const gameplay = media.cover || media.images[2] || media.images[0]
  const characters = [
    {
      name: "Mövlud",
      label: "A father, looking back.",
      description:
        "At 65, Mövlud discovers his daughter’s diary. Its pages lead him back to painful memories and the wish to make things right.",
      image: artwork.find((item) => item.category === "movlud")?.src || media.images[0],
    },
    {
      name: "Ziver",
      label: "A daughter’s diary.",
      description:
        "Ziver is Mövlud’s daughter. Her diary is at the heart of the story, connecting a father to the memories he revisits.",
      image: artwork.find((item) => item.category === "ziver")?.src || media.images[1],
    },
  ]
  const contributions = [
    {
      id: "puzzle",
      title: "Puzzle programming",
      number: "01",
      text: "I implemented puzzles for Blue Diary’s adventure and puzzle gameplay.",
      tag: "Puzzle implementation",
    },
    {
      id: "piano",
      title: "The interactive piano",
      number: "02",
      text: "I developed the interactive in-game piano, designed to feel realistic to play.",
      tag: "Interactive instrument",
    },
    {
      id: "music",
      title: "Music, on disc",
      number: "03",
      text: "I implemented the interactive music player with discs.",
      tag: "Disc-based music player",
    },
  ]
  const info = [
    ["Project", "Team project"],
    ["Genre", "Adventure / Puzzle"],
    ["Art direction", "2.5D pixel art"],
    ["Engine", "Unity"],
    ["My role", "Developer"],
    ["Context", "Incubation program"],
    ["Status", "Discontinued"],
  ]
  return (
    <article class="blue-diary" aria-labelledby="diary-title">
      <div class="diary-topline">
        <a href={`${props.root}/projects`}>← Back to projects</a>
        <span>
          A project from the archive <i aria-hidden="true">✦</i>
        </span>
      </div>
      <header class="diary-hero">
        <div class="diary-hero-copy">
          <p class="diary-kicker">
            ADVENTURE / PUZZLE <span class="diary-dot" /> 2.5D PIXEL ART
          </p>
          <h1 id="diary-title">
            Blue
            <br />
            <em>Diary</em>
            <span class="diary-title-star" aria-hidden="true">
              ✧
            </span>
          </h1>
          <p class="diary-subtitle">
            Some memories ask
            <br />
            to be opened again.
          </p>
          <p class="diary-intro">
            A father. A daughter’s diary. A return to the moments that still matter.
          </p>
          <div class="diary-hero-meta">
            <span class="diary-status">Discontinued</span>
            <span>Unity</span>
            <span>Developer</span>
          </div>
          <a class="diary-turn-page" href="#diary-story">
            Open the diary <span aria-hidden="true">↓</span>
          </a>
        </div>
        <figure class="diary-cover">
          <span class="diary-cover-label">
            BLUE DIARY <span>PROJECT JOURNAL</span>
          </span>
          <div class="diary-cover-art">
            <Artwork
              src={gameplay}
              alt="Blue Diary gameplay still: a warm pixel-art room with a fireplace"
              label="A window into Blue Diary"
            />
          </div>
          <figcaption>
            <span>Memory · family · reflection</span>
            <span aria-hidden="true">01</span>
          </figcaption>
        </figure>
      </header>
      <nav class="diary-chapters" aria-label="Blue Diary chapters">
        {[
          ["01", "The story", "story"],
          ["02", "Characters", "characters"],
          ["03", "The world", "world"],
          ["04", "My work", "work"],
          ["05", "Sketchbook", "gallery"],
        ].map(([n, label, id]) => (
          <a href={`#diary-${id}`}>
            <span>{n}</span>
            {label}
          </a>
        ))}
      </nav>
      <section id="diary-story" class="diary-story diary-paper">
        <div>
          <Chapter number="01" label="BETWEEN THE PAGES" />
          <h2>
            A diary found.
            <br />
            <em>A life revisited.</em>
          </h2>
          <p class="diary-margin-note">
            The things we leave
            <br />
            between the lines.
          </p>
        </div>
        <div class="diary-story-text">
          <p class="diary-dropcap">
            Mövlud is 65 when he discovers a diary belonging to his daughter, Ziver.
          </p>
          <p>Through its pages, he revisits painful memories and tries to make things right.</p>
          <p class="diary-story-end">
            Blue Diary brings this emotional foundation into a 2.5D pixel-art adventure and puzzle
            game.
          </p>
          <span class="diary-flourish" aria-hidden="true">
            — ✦ —
          </span>
        </div>
      </section>
      <section id="diary-characters" class="diary-section">
        <div class="diary-section-heading">
          <div>
            <Chapter number="02" label="THE PEOPLE IN ITS PAGES" />
            <h2>
              Two lives.
              <br />
              <em>One diary.</em>
            </h2>
          </div>
          <p>
            A father and daughter,
            <br />
            connected through memory.
          </p>
        </div>
        <div class="diary-spread">
          {characters.map((character, i) => (
            <section class="diary-character">
              <div class="diary-character-top">
                <span>CHARACTER STUDY</span>
                <span>0{i + 1}</span>
              </div>
              <div class="diary-character-art">
                <Artwork
                  src={character.image}
                  alt={`${character.name} approved character reference`}
                  label={`${character.name} · character study`}
                />
              </div>
              <div class="diary-character-caption">
                <h3>{character.name}</h3>
                <p class="diary-character-label">{character.label}</p>
                <p>{character.description}</p>
              </div>
            </section>
          ))}
        </div>
      </section>
      <section id="diary-world" class="diary-gameplay diary-section">
        <div class="diary-section-heading">
          <div>
            <Chapter number="03" label="THE GAME, IN MOTION" />
            <h2>
              A glimpse inside.
              <br />
              <em>A moment to stay.</em>
            </h2>
          </div>
          <p>
            Original recordings from Blue Diary.
            <br />
            Choose a page of the story to watch.
          </p>
        </div>
        <p class="diary-gameplay-intro">
          An adventure and puzzle project told through 2.5D pixel art, with memory and family at the
          center of its premise. These recordings include project footage and presentation material.
        </p>
        {playlist.length ? (
          <FeaturedVideoPlayer
            videos={playlist}
            id="diary-gameplay-player"
            label="THE MOVING PAGES"
          />
        ) : (
          <div class="diary-world-visual">
            <Artwork src={gameplay} alt="Blue Diary gameplay still" label="Inside the game" />
          </div>
        )}
      </section>
      <section id="diary-work" class="diary-work diary-section">
        <div class="diary-section-heading">
          <div>
            <Chapter number="04" label="MY HAND IN THE PROJECT" />
            <h2>
              Making the details
              <br />
              <em>interactive.</em>
            </h2>
          </div>
          <p>
            My role: Developer.
            <br />
            The work I contributed.
          </p>
        </div>
        <div class="diary-contribution-showcases">
          {contributions.map((item) => (
            <ContributionMediaCard
              {...item}
              key={item.id}
              videos={videos.filter(
                (video) => video.displayMode === "contribution" && video.category === item.id,
              )}
            />
          ))}
        </div>
        <p class="diary-credit-note">
          The contributions above describe my development work. Character art and visual references
          are shown for project context; I do not claim authorship.
        </p>
      </section>
      <section id="diary-gallery" class="diary-section">
        <div class="diary-section-heading">
          <div>
            <Chapter number="05" label="FROM THE SKETCHBOOK" />
            <h2>
              Notes, poses
              <br />
              <em>& little worlds.</em>
            </h2>
          </div>
          <p>
            Character references, sprite sheets
            <br />
            and moments from the game.
          </p>
        </div>
        {artImages.length ? (
          <div class="diary-gallery">
            {artImages.map((src, i) => (
              <details class="diary-gallery-item">
                <summary>
                  <img
                    src={src}
                    alt={artwork[i]?.title || `Blue Diary reference ${i + 1}`}
                    loading="lazy"
                  />
                  <span>
                    {artwork[i]?.title || `Reference ${String(i + 1).padStart(2, "0")}`}{" "}
                    <span>Expand ↗</span>
                  </span>
                </summary>
                <a href={src} target="_blank" rel="noopener noreferrer">
                  <img src={src} alt={`Expanded Blue Diary reference ${i + 1}`} loading="lazy" />
                  Open original ↗
                </a>
              </details>
            ))}
          </div>
        ) : (
          <div class="diary-gallery-empty">
            <span aria-hidden="true">✧</span>
            <div>
              <h3>The sketchbook is waiting.</h3>
              <p>
                Character sheets, animation studies and gameplay stills will appear here when the
                approved artwork is supplied.
              </p>
            </div>
          </div>
        )}
        {videos
          .filter((video) => video.displayMode === "decorative")
          .map((video) => (
            <figure class="diary-mini-animation">
              <ProjectVideo
                src={video.src}
                poster={video.poster || undefined}
                preview={video.autoplayPreview}
                loop={video.loop}
              />
              <figcaption>{video.title}</figcaption>
            </figure>
          ))}
      </section>
      <section class="diary-colophon diary-paper">
        <div>
          <Chapter number="06" label="PROJECT COLOPHON" />
          <h2>
            Behind
            <br />
            <em>the pages.</em>
          </h2>
          <p>
            A team project developed during an incubation program. The program name and exact
            development dates are not confirmed.
          </p>
        </div>
        <dl>
          {info.map(([label, value]) => (
            <div>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section class="diary-reflection">
        <p class="diary-kicker">THE LAST PAGE, FOR NOW</p>
        <h2>
          Development ended.
          <br />
          <em>The work remains.</em>
        </h2>
        <p>
          Blue Diary is discontinued, with no plans to resume development. The puzzles, piano and
          music player remain part of my development portfolio.
        </p>
        <p>These pages preserve that work and the story it was built around.</p>
        <span class="diary-flourish" aria-hidden="true">
          — ✦ —
        </span>
        <a href={`${props.root}/projects`}>Return to the project collection ↗</a>
      </section>
    </article>
  )
}
