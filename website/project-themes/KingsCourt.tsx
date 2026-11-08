import type { ProjectThemeProps } from "./media"
import { approvedMedia } from "./media"
import { documentedSection, labeledValue } from "./content"
import { CourtGallery, CourtMedia } from "./CourtMedia"

const play = "https://farhaddev.itch.io/are-you-king-enough"
const labels: [RegExp, string][] = [
  [/NPC movement/i, "Movement in the court"],
  [/NPC animations/i, "Bringing characters to life"],
  [/Main menu/i, "The first interaction"],
  [/ScriptableObjects/i, "NPC data"],
  [/daily requirements/i, "Daily requirements"],
]
function Chapter({ number, title }: { number: string; title: string }) {
  return (
    <p class="court-eyebrow">
      <span>{number}</span>
      {title}
    </p>
  )
}
export function KingsCourt(props: ProjectThemeProps) {
  const fm = props.fileData.frontmatter as Record<string, unknown>
  const title = typeof fm.title === "string" ? fm.title : "Are You King Enough"
  const media = approvedMedia(props)
  const overview = documentedSection(props.fileData, /^Overview$/i)
  const jam = documentedSection(props.fileData, /^Game jam$/i)
  const team = documentedSection(props.fileData, /^Team and my role$/i)
  const contributions = documentedSection(props.fileData, /^My contributions/i)
  const engine = [fm.engine, fm["engine-version"]].filter((v) => typeof v === "string").join(" ")
  const role = typeof fm.role === "string" ? fm.role : labeledValue(team.items, "My role")
  const tools = contributions.paragraphs.join(" ").match(/Tool\/library:\s*([^.!\n]+)/i)?.[1] ?? ""
  const language =
    contributions.paragraphs
      .join(" ")
      .match(/(?:Programming language|Language):\s*([^.!\n]+)/i)?.[1] ?? ""
  const info = [
    ["Engine", engine],
    ["Language", language],
    ["Tool / library", tools],
    ["Game jam", labeledValue(jam.items, "Event")],
    ["Duration", labeledValue(jam.items, "Duration")],
    ["Theme", labeledValue(jam.items, "Theme")],
    ["Development", labeledValue(jam.items, "Development dates")],
    ["My role", role],
    ["Platform", typeof fm.platform === "string" ? fm.platform : ""],
    ["Status", typeof fm.status === "string" ? fm.status : ""],
  ].filter(([, value]) => value)
  const result = labeledValue(jam.items, "Result")
  const hero = media.cover || media.images[0]
  const court = media.images[2] || media.images[1]
  return (
    <article class="kings-court" aria-labelledby="court-title">
      <div class="court-topline">
        <a href={`${props.root}/projects`}>&#8592; Project collection</a>
        <span>
          THE KING'S COURT <span aria-hidden="true">&#10022;</span>
        </span>
      </div>
      <header class="court-hero">
        {hero && <img class="court-hero-backdrop" src={hero} alt="" aria-hidden="true" />}
        <div class="court-hero-copy">
          <p class="court-eyebrow">GAME JAM / A ROYAL AUDIENCE</p>
          <h1 id="court-title">{title}</h1>
          <p class="court-hero-subtitle">
            The crown is yours.
            <br />
            <em>So are the consequences.</em>
          </p>
          <p class="court-hero-description">{overview.paragraphs[0]}</p>
          <div class="court-badges">
            <span>{typeof fm.category === "string" ? fm.category : "Game Jam"}</span>
            {fm.status && <span>Development {String(fm.status)}</span>}
            {engine && <span>{String(fm.engine)}</span>}
          </div>
          <div class="court-actions">
            <a class="court-play" href={play} target="_blank" rel="noopener noreferrer">
              Play Game <span aria-hidden="true">&#8599;</span>
            </a>
            {contributions.items.length > 0 && <a href="#court-work">My contribution &#8595;</a>}
          </div>
        </div>
        {hero ? (
          <figure class="court-hero-art">
            <a
              href={hero}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View official title artwork at full size"
            >
              <img
                src={hero}
                alt="Official Are You King Enough title artwork: illustrated royal figures, parchment title and a torchlit castle"
                loading="eager"
                decoding="async"
              />
            </a>
            <figcaption>
              <span>OFFICIAL GAME ARTWORK</span>
              <span>01 / THE AUDIENCE</span>
            </figcaption>
          </figure>
        ) : (
          <div class="court-media-pending">Official game artwork has not been supplied.</div>
        )}
      </header>
      <nav class="court-chapters" aria-label="The King's Court chapters">
        {[
          ["01", "The premise", "overview"],
          ["02", "Choices & consequences", "choices"],
          ["03", "The court", "characters"],
          ["04", "My work", "work"],
          ["05", "The archive", "gallery"],
        ]
          .filter(
            ([, , id]) =>
              (id !== "overview" || overview.paragraphs.length > 0) &&
              (id !== "work" || contributions.items.length > 0),
          )
          .map(([n, text, id]) => (
            <a href={`#court-${id}`}>
              <span>{n}</span>
              {text}
            </a>
          ))}
      </nav>
      <div class="court-act court-act-warm">
        {overview.paragraphs.length > 0 && (
          <section id="court-overview" class="court-parchment court-overview">
            <div>
              <Chapter number="01" title="A CROWN. A KINGDOM. A CHOICE." />
              <h2>
                Everyone wants
                <br />
                <em>an answer.</em>
              </h2>
            </div>
            <div>
              <p>{overview.paragraphs[0]}</p>
              {overview.paragraphs
                .slice(1)
                .filter((p) => p.startsWith("Central question:"))
                .map((p) => (
                  <blockquote>{p.replace(/^Central question:\s*/, "")}</blockquote>
                ))}
            </div>
          </section>
        )}
        <section id="court-choices" class="court-section">
          <div class="court-section-heading">
            <div>
              <Chapter number="02" title="CHOICES & CONSEQUENCES" />
              <h2>
                Hear their requests.
                <br />
                <em>Bear the weight.</em>
              </h2>
            </div>
            <p>
              Limited resources.
              <br />
              Decisions that carry a cost.
            </p>
          </div>
          <div class="court-choices-layout">
            {court && (
              <figure class="court-frame">
                <a href={court} target="_blank" rel="noopener noreferrer">
                  <img
                    src={court}
                    alt="Illustrated inhabitants and knights surrounding the parchment dialogue interface in the royal court"
                    loading="lazy"
                  />
                </a>
                <figcaption>A royal audience, as seen in the game.</figcaption>
              </figure>
            )}
            <ol class="court-decision-list">
              {[
                ["The request", "The kingdom's inhabitants come before the king with requests."],
                ["The decision", "The player decides how to respond and whom to help."],
                ["The cost", "Resources are limited. Decisions have costs."],
                [
                  "The consequence",
                  "Choices influence the direction and increasingly dark atmosphere of the experience.",
                ],
              ].map(([heading, body], i) => (
                <li>
                  <span>0{i + 1}</span>
                  <div>
                    <h3>{heading}</h3>
                    <p>{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>
      <div class="court-act court-act-shadow">
        <section id="court-characters" class="court-section">
          <div class="court-section-heading">
            <div>
              <Chapter number="03" title="AN AUDIENCE WITH THE COURT" />
              <h2>
                Many faces.
                <br />
                <em>One throne.</em>
              </h2>
            </div>
            <p>
              Illustrated characters from the game.
              <br />
              Original compositions, shown in full.
            </p>
          </div>
          {media.images.length > 1 ? (
            <CourtGallery
              label="Character artwork within approved court scenes"
              images={media.images.slice(1, 3).map((src, i) => ({
                src,
                caption:
                  i === 0
                    ? "Royal figures in the illustrated court"
                    : "Knights and inhabitants around the dialogue interface",
              }))}
            />
          ) : (
            <p class="court-media-pending">Character reference images have not been supplied.</p>
          )}
          <p class="court-caption-note">
            Character artwork is shown within the supplied gameplay scenes. Standalone character
            sheets and documented character names have not been supplied.
          </p>
        </section>
        {contributions.items.length > 0 && (
          <section id="court-work" class="court-section">
            <div class="court-section-heading">
              <div>
                <Chapter number="04" title="MY HAND IN THE KINGDOM" />
                <h2>
                  Behind
                  <br />
                  <em>the audience.</em>
                </h2>
              </div>
              <p>
                {role}
                <br />
                Documented personal contributions.
              </p>
            </div>
            <div class="court-contributions">
              {contributions.items.map((item, i) => (
                <article>
                  <span class="court-work-number">0{i + 1}</span>
                  <h3>
                    {labels.find(([pattern]) => pattern.test(item))?.[1] ??
                      "Development contribution"}
                  </h3>
                  <p>{item}</p>
                </article>
              ))}
            </div>
            <p class="court-caption-note">
              Personal contributions are reported in the public project note. The game screenshots
              show the team's work; they are not contribution-specific evidence.
            </p>
          </section>
        )}
        <section id="court-gallery" class="court-section">
          <div class="court-section-heading">
            <div>
              <Chapter number="05" title="FROM THE ROYAL ARCHIVE" />
              <h2>
                The court,
                <br />
                <em>as it appeared.</em>
              </h2>
            </div>
            <p>
              Original screenshots.
              <br />
              Open any frame to see it in full.
            </p>
          </div>
          {media.images.length || media.videos.length ? (
            <CourtMedia media={media} />
          ) : (
            <p class="court-media-pending">Approved project media has not been supplied.</p>
          )}
        </section>
      </div>
      <div class="court-act court-act-dark">
        {info.length > 0 && (
          <section class="court-record court-section">
            <div>
              <Chapter number="06" title="THE PROJECT RECORD" />
              <h2>
                Built in a jam.
                <br />
                <em>Kept in the archive.</em>
              </h2>
              {result && <p class="court-result">Jam result: {result}</p>}
              <p class="court-caption-note">
                Project details and contributions are supplied by the project owner. Individual
                contributions have not been independently verified.
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
        )}
        {team.items.length > 0 && (
          <section class="court-team">
            <h2>The people behind the court</h2>
            <ul>
              {team.items
                .filter((item) => !item.startsWith("My role:"))
                .map((item) => (
                  <li>{item}</li>
                ))}
            </ul>
          </section>
        )}
        <section class="court-ending">
          <span class="court-ending-mark" aria-hidden="true">
            &#10022;
          </span>
          <p class="court-eyebrow">THE AUDIENCE ENDS HERE</p>
          <h2>
            How much conscience
            <br />
            will you sacrifice
            <br />
            <em>to protect the throne?</em>
          </h2>
          <p>
            Development has stopped. The game and this record of its development remain available.
          </p>
          <a class="court-play" href={play} target="_blank" rel="noopener noreferrer">
            Enter the court &#8599;
          </a>
          <a class="court-return" href={`${props.root}/projects`}>
            Return to all projects &#8594;
          </a>
        </section>
      </div>
    </article>
  )
}
