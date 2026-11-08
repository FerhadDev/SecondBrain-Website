import type { Root, RootContent } from "hast"
import { htmlToJsx } from "../../quartz/util/jsx"
import { approvedMedia, type ProjectThemeProps } from "./media"
import { documentedSection, nodeText } from "./content"
import { ProjectVideo } from "./CourtMedia"

// Preserve the synchronized HTML, including tables, credits and resolved public links.
function chapters(props: ProjectThemeProps) {
  const sections: { title: string; nodes: RootContent[] }[] = []
  for (const node of props.fileData.htmlAst?.children ?? []) {
    if (node.type === "element" && node.tagName === "h2") {
      sections.push({ title: nodeText(node), nodes: [] })
    } else if (sections.length) sections.at(-1)!.nodes.push(node)
  }
  return sections.filter(
    ({ title }) => !/^Screen\s*shorts|^Screenshots|^Media gallery/i.test(title),
  )
}

export function Tengri(props: ProjectThemeProps) {
  const fm = props.fileData.frontmatter as Record<string, unknown>
  const media = approvedMedia(props)
  const hero = media.cover || media.images[0]
  const sections = chapters(props)
  const overview = documentedSection(props.fileData, /^Overview$/i)
  return (
    <article class="tengri" aria-labelledby="tengri-title">
      <div class="tengri-topline">
        <a href={`${props.root}/projects`}>&#8592; All projects</a>
        <span>{String(fm.event ?? "")}</span>
      </div>
      <header class="tengri-hero">
        <div class="tengri-intro">
          <p class="tengri-kicker">{String(fm.genre ?? "")}</p>
          <h1 id="tengri-title">{String(fm.title)}</h1>
          <p>{typeof fm.description === "string" ? fm.description : overview.paragraphs[0]}</p>
          <div class="tengri-badges">
            {[fm.category, fm.engine, fm.platform, fm.status].filter(Boolean).map((value) => (
              <span>{String(value)}</span>
            ))}
          </div>
          <a class="tengri-button" href="#tengri-my-contributions">
            My contributions &#8595;
          </a>
        </div>
        {hero ? (
          <a class="tengri-hero-art" href={hero} target="_blank" rel="noopener noreferrer">
            <img
              src={hero}
              alt="Tengri gameplay: illustrated pieces on an ivory and charcoal board, wooden panels and stone walls"
              loading="eager"
              decoding="async"
            />
            <span>Windows prototype / View full-size screenshot &#8599;</span>
          </a>
        ) : (
          <p class="tengri-missing">Screenshots have not been supplied.</p>
        )}
      </header>
      <nav class="tengri-nav" aria-label="Project sections">
        {sections.map(({ title }) => (
          <a href={`#tengri-${sectionId(title)}`}>{title}</a>
        ))}
        <a href="#tengri-gallery">Media gallery</a>
      </nav>
      <div class="tengri-content">
        {sections.map(({ title, nodes }, index) => (
          <section class="tengri-chapter" id={`tengri-${sectionId(title)}`}>
            <div class="tengri-section-heading">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h2>{title === "Technologies used" ? "Technical breakdown" : title}</h2>
            </div>
            <div class="tengri-prose">
              {htmlToJsx(props.fileData.filePath!, { type: "root", children: nodes } as Root)}
            </div>
          </section>
        ))}
        <section class="tengri-chapter" id="tengri-gallery">
          <div class="tengri-section-heading">
            <span>ART</span>
            <h2>Media gallery</h2>
          </div>
          <div class="tengri-gallery">
            {media.images.map((src, i) => (
              <figure>
                <a
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open Tengri screenshot ${i + 1} at full size`}
                >
                  <img
                    src={src}
                    alt={`Tengri gameplay screenshot ${i + 1}`}
                    loading="lazy"
                    decoding="async"
                  />
                </a>
                <figcaption>
                  Gameplay / {String(i + 1).padStart(2, "0")} <span>View full size &#8599;</span>
                </figcaption>
              </figure>
            ))}
          </div>
          {!media.images.length && (
            <p class="tengri-missing">Screenshots have not been supplied.</p>
          )}
          {media.videos.map((src) => (
            <ProjectVideo src={src} />
          ))}
        </section>
      </div>
      <footer class="tengri-footer">
        <span>
          {String(fm.studio ?? "")} / {String(fm.role ?? "")}
        </span>
        <a href={`${props.root}/projects`}>Return to projects &#8594;</a>
      </footer>
    </article>
  )
}

const sectionId = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
