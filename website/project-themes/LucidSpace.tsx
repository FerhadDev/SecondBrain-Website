import type { Root, RootContent } from "hast"
import { htmlToJsx } from "../../quartz/util/jsx"
import { approvedMedia, type ProjectThemeProps } from "./media"
import { documentedSection, labeledValue, nodeText } from "./content"
import { ProjectVideo } from "./CourtMedia"
import { discoverProjects } from "../projects"

export function LucidSpace(props: ProjectThemeProps) {
  const { fileData, root } = props
  const fm = fileData.frontmatter as Record<string, unknown>
  const media = approvedMedia(props)
  const cover = media.cover || media.images[0]
  const overview = documentedSection(fileData, /^Project overview$/i)
  const gameplay = documentedSection(fileData, /^Gameplay$/i)
  const abilities = gameplay.paragraphs.filter((p) => /music discs|disc ability/i.test(p))
  const contributions = documentedSection(fileData, /^My contributions$/i)
  const technology = documentedSection(fileData, /^Technologies used$/i)
  const creditStudio = labeledValue(documentedSection(fileData, /^Team members$/i).items, "Studio").replace(/\.$/, "")
  const conflictingStudio = creditStudio && fm.studio && creditStudio.toLowerCase() !== String(fm.studio).toLowerCase()
  const project = discoverProjects([fileData], props.ctx.allFiles)[0]
  const known = (text: string) => !/to be (?:confirmed|documented)/i.test(text)
  const sections = ["Overview", "Gameplay", ...(abilities.length ? ["Music-disc abilities"] : []),
    ...(media.videos.length ? ["Gameplay video"] : []), "My contributions", "Technologies"]
  // Keep public credits and note relationships as sanitized HTML, including their links.
  const sourceSection = (heading: string) => {
    const nodes: RootContent[] = []
    let found = false
    for (const node of fileData.htmlAst?.children ?? []) {
      if (node.type === "element" && node.tagName === "h2") {
        if (found) break
        found = nodeText(node) === heading
      } else if (found) nodes.push(node)
    }
    return htmlToJsx(fileData.filePath!, { type: "root", children: nodes } as Root)
  }
  return (
    <article class="lucid-space" aria-labelledby="lucid-space">
      <div class="lucid-topline">
        <a href={`${root}/projects`}>← All projects</a>
        <span>{String(fm.event ?? "")} / {String(fm.duration ?? "")}</span>
      </div>
      <header class="lucid-hero">
        <div class="lucid-intro">
          <p class="lucid-kicker">{String(fm.genre ?? "")} / {String(fm.platform ?? "")}</p>
          <h1 id="lucid-space">{String(fm.title)}</h1>
          <p>{overview.paragraphs[0]}</p>
          <div class="lucid-actions">
            <a class="lucid-button" href="#lucid-gameplay">Explore the ship ↓</a>
            {project?.itch && <a class="lucid-button secondary" href={project.itch} target="_blank" rel="noopener noreferrer">View on itch.io ↗</a>}
          </div>
        </div>
        {cover ? <figure class="lucid-title-art">
          <a href={cover} target="_blank" rel="noopener noreferrer" aria-label="Open Lucid Space title artwork at full size">
            <img src={cover} alt="Lucid Space title screen: cyan pixel lettering and Start button against a starfield" loading="eager" decoding="async" />
          </a>
          <figcaption>Title screen / Original game artwork</figcaption>
        </figure> : <p class="lucid-notice">Title artwork has not been supplied.</p>}
      </header>
      <nav class="lucid-section-nav" aria-label="Lucid Space sections">
        {sections.map((title) => <a key={title} href={`#lucid-${sectionId(title)}`}>{title}</a>)}
      </nav>
      <section id="lucid-overview" class="lucid-panel">
        <p class="lucid-kicker">01 / MISSION BRIEF</p>
        <h2>Game overview</h2>
        <dl class="lucid-facts">
          {["genre", "platform", "engine", "role", "duration", "status"].filter((key) => fm[key]).map((key) =>
            <div key={key}><dt>{key}</dt><dd>{String(fm[key])}</dd></div>)}
        </dl>
        {overview.paragraphs.slice(1).map((text) => <p class="lucid-source" key={text}>{text}</p>)}
      </section>
      <section id="lucid-gameplay" class="lucid-panel">
        <p class="lucid-kicker">02 / SHIP INTERIOR</p>
        <h2>Gameplay</h2>
        <ul>{gameplay.items.filter(known).map((text) => <li key={text}>{text}</li>)}</ul>
        {gameplay.paragraphs.filter((p) => !abilities.includes(p) && !/^Source:/i.test(p)).map((text) => <p key={text}>{text}</p>)}
        <div class="lucid-gallery">
          {media.images.filter((src) => src !== cover).map((src, i) => <figure key={src}>
            <a href={src} target="_blank" rel="noopener noreferrer" aria-label={`Open Lucid Space gameplay screenshot ${i + 1} at full size`}>
              <img src={src} alt={`Lucid Space spaceship gameplay screenshot ${i + 1}`} loading="lazy" decoding="async" />
            </a>
            <figcaption>Ship interior / {String(i + 1).padStart(2, "0")} <span>View full size ↗</span></figcaption>
          </figure>)}
        </div>
      </section>
      {abilities.length > 0 && <section id="lucid-music-disc-abilities" class="lucid-panel">
        <p class="lucid-kicker">03 / PORTABLE PLAYER</p>
        <h2>Music-disc abilities</h2>
        {abilities.map((text) => <p key={text}>{text}</p>)}
        <p class="lucid-source">Only the documented ability system is described here; individual disc effects are not specified in the public note.</p>
      </section>}
      {media.videos.length > 0 && <section id="lucid-gameplay-video" class="lucid-panel" aria-labelledby="lucid-video-title">
        <p class="lucid-kicker">04 / FLIGHT RECORDING</p>
        <h2 id="lucid-video-title">Gameplay video</h2>
        {media.videos.map((src) => <div class="lucid-video" key={src} role="group" aria-label="Lucid Space gameplay video player">
          <ProjectVideo src={src} poster={cover} />
          <a href={src} target="_blank" rel="noopener noreferrer">Open original video ↗</a>
        </div>)}
      </section>}
      <div class="lucid-details-grid">
        <section id="lucid-my-contributions" class="lucid-panel">
          <h2>My contributions</h2>
          <ul>{contributions.items.filter(known).map((text) => <li key={text}>{text}</li>)}</ul>
          <p class="lucid-source">Specific systems and technical contributions have not yet been documented.</p>
        </section>
        <section id="lucid-technologies" class="lucid-panel">
          <h2>Technologies</h2>
          <ul>{technology.items.filter(known).map((text) => <li key={text}>{text}</li>)}</ul>
          {!technology.items.some(known) && fm.engine && <p>{String(fm.engine)}</p>}
        </section>
      </div>
      <details class="lucid-panel lucid-credits">
        <summary>Public credits and related notes</summary>
        {conflictingStudio && <p class="lucid-source">The public note names different studios in its overview and credits. Studio attribution needs owner confirmation.</p>}
        <h2>Team members</h2>{sourceSection("Team members")}
        <h2>Related public notes</h2>{sourceSection("Related public notes")}
      </details>
      <footer class="lucid-footer">
        <a href={`${root}/projects`}>← Return to projects</a>
        {project?.itch && <a href={project.itch} target="_blank" rel="noopener noreferrer">Lucid Space on itch.io ↗</a>}
      </footer>
    </article>
  )
}

const sectionId = (title: string) => title.toLowerCase().replace(/\s+/g, "-")
