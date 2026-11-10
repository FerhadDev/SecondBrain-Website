import { projectTheme } from "./project-themes"
import { PageFrame } from "../quartz/components/frames/types"
import { pathToRoot } from "../quartz/util/path"
import { ProjectMedia } from "./ProjectMedia"
import { discoverProjects } from "./projects"
import { ProjectsShowcase } from "./ProjectsShowcase"
import { itchActionLabel, profileLinks } from "./profile-links"

const plain = (node: any): string =>
  node?.type === "text" ? node.value : (node?.children ?? []).map(plain).join("")
function skills(file: any) {
  const nodes = file?.htmlAst?.children ?? []
  const start = nodes.findIndex((n: any) => n.tagName === "h2" && /Technical Skills/.test(plain(n)))
  const result: { title: string; items: string[] }[] = []
  if (start < 0) return result
  for (let i = start + 1; i < nodes.length && nodes[i].tagName !== "h2"; i++) {
    if (nodes[i].tagName === "h3") result.push({ title: plain(nodes[i]), items: [] })
    if (nodes[i].tagName === "ul" && result.length)
      result
        .at(-1)!
        .items.push(...nodes[i].children.filter((n: any) => n.tagName === "li").map(plain))
  }
  return result
}
function documentedGenre(file: any, about: any) {
  if (file.frontmatter?.genre) return String(file.frontmatter.genre)
  const nodes = about?.htmlAst?.children ?? []
  const heading = nodes.findIndex(
    (n: any) =>
      n.tagName === "h3" &&
      plain(n).toLowerCase() === String(file.frontmatter?.title).toLowerCase(),
  )
  if (heading < 0) return ""
  const value = plain(nodes.slice(heading + 1).find((n: any) => n.type === "element")).trim()
  return value.startsWith("Genre:") ? value.slice(6).trim() : ""
}
export const PortfolioFrame: PageFrame = {
  name: "portfolio",
  render({ componentData: p, pageBody: Content, header, right }) {
    const root = pathToRoot(p.fileData.slug!)
    const href = (slug: string) => `${root}/${slug.split("/").map(encodeURIComponent).join("/")}`
    const theme = projectTheme(p.fileData)
    const ThemedProject = theme?.Component
    const home = p.fileData.slug === "index"
    const graph = p.fileData.slug === "graph"
    const gallery = p.fileData.slug === "projects"
    const project =
      /\/projects\//i.test(p.fileData.slug ?? "") && !p.fileData.slug?.endsWith("/index")
    const about = p.allFiles.find((f) => /brain\/about-me$/i.test(f.slug ?? ""))
    const publicNotes = (type: "skill" | "achievement") => p.allFiles
      .filter((file) => file.slug?.startsWith("brain/") && !file.slug.endsWith("/index") &&
        file.frontmatter?.visibility === "public" && file.frontmatter.type === type &&
        file.frontmatter.publish !== false && !file.frontmatter.encrypted && !file.unlisted)
      .sort((a, b) => String(a.frontmatter?.title).localeCompare(String(b.frontmatter?.title), "en"))
    const discoveredProjects = discoverProjects(p.allFiles, p.ctx.allFiles)
    const title = p.fileData.frontmatter?.title
    const fm = { ...p.fileData.frontmatter, genre: documentedGenre(p.fileData, about) } as Record<
      string,
      any
    >
    const graphNotes = (
      <ul class="graph-note-list" aria-label="Public notes">
        {p.allFiles
          .filter((f) => f.slug?.startsWith("brain/") && !f.slug.endsWith("/index"))
          .map((f) => (
            <li><a href={href(f.slug!)}>{f.frontmatter?.title}</a></li>
          ))}
      </ul>
    )
    const graphControls = (
      <div class="graph-controls">
          <label>
            Find a note{" "}
            <input type="search" placeholder="Search public notes…" class="graph-search" />
          </label>
          <label>
            Category{" "}
            <select class="graph-category">
              <option value="">All categories</option>
              {["Projects", "Skills", "Achievements", "Knowledge"].map((x) => (
                <option>{x}</option>
              ))}
            </select>
          </label>
          <button class="graph-reset" type="button">
            Reset view
          </button>
      </div>
    )
    const graphView = (
      <div class="brain-graph" data-index={`${root}/static/contentIndex.json`}>
        {home ? <details class="graph-preview-filters">
          <summary>Search and filter</summary>
          {graphControls}
        </details> : graphControls}
        <div class="graph-legend">
          {["Projects", "Skills", "Achievements", "Knowledge"].map((x) => (
            <span data-category={x}>{x}</span>
          ))}
        </div>
        <svg viewBox="0 0 1000 500" role="img" aria-label="Interactive public knowledge graph" />
        <p class="graph-hint">Scroll to zoom · drag to pan · select a node to open its note</p>
        {home ? <details class="graph-preview-notes">
          <summary>Browse public notes</summary>
          {graphNotes}
        </details> : graphNotes}
        <noscript>
          Enable JavaScript for the interactive graph. Public note links are available above.
        </noscript>
      </div>
    )
    return (
      <div class={`portfolio-shell ${home ? "homepage-shell" : ""} ${theme?.className ?? ""}`}>
        <a class="skip-link" href="#main-content">
          Skip to content
        </a>
        <header class="portfolio-nav">
          <a class="wordmark" href={href("index")}>
            fz<span>.</span> <small>Farhad Zamanov</small>
          </a>
          <nav aria-label="Main navigation">
            {!home && <a href={href("index")}>Home</a>}
            <a href={href("projects")} aria-current={gallery ? "page" : undefined}>
              Projects
            </a>
            {!home && <a href={`${href("index")}#skills`}>Skills</a>}
            {about && <a href={href(about.slug!)}>About</a>}
            <a href={href("graph")}>{home ? "Graph" : "Knowledge Graph"}</a>
            {!home && <a href="https://github.com/FerhadDev" target="_blank" rel="noopener noreferrer">
              GitHub ↗
            </a>}
          </nav>
          <div class="portfolio-search">
            {header.map((C) => (
              <C {...p} />
            ))}
          </div>
        </header>
        <main
          id="main-content"
          class={
            theme
              ? "project-themed-page"
              : home
                ? "portfolio-home"
                : graph
                  ? "graph-page"
                  : gallery
                    ? "projects-page"
                    : `portfolio-article ${project ? "project-page" : ""}`
          }
        >
          {/* Quartz's Mermaid initializer needs this scope; display:contents preserves layout. */}
          <div class="center" style="display: contents">
            {ThemedProject ? (
              <ThemedProject {...p} root={root} />
            ) : home ? (
              <>
                <section class="hero">
                  <div class="eyebrow">Farhad Zamanov</div>
                  <h1>
                    I build interactive worlds through <span>code and design.</span>
                  </h1>
                  <p class="hero-role">
                    Game Developer &amp; Game Designer
                  </p>
                  <p class="hero-intro">
                    I design gameplay experiences, develop interactive systems, and turn creative
                    ideas into playable games. My primary tools are Unity and C#.
                  </p>
                  <div class="hero-actions">
                    <a class="button primary" href={href("projects")}>
                      Explore Projects <span aria-hidden="true">↗</span>
                    </a>
                    {about && <a class="button" href={href(about.slug!)}>
                      About Me <span aria-hidden="true">→</span>
                    </a>}
                  </div>
                  <ul class="hero-skills" aria-label="Technical skills">
                    {skills(about).flatMap((group) => group.items).slice(0, 4).map((skill) => (
                      <li>{skill}</li>
                    ))}
                  </ul>
                </section>
                <section id="projects">
                  <div class="section-heading">
                    <div>
                      <div class="eyebrow">01 / SELECTED WORK</div>
                      <h2>Built to be played.</h2>
                    </div>
                    <p>Game jams, experiments, and the systems behind them.</p>
                  </div>
                  <div class="project-grid">
                    {discoveredProjects.map((discovered, i) => {
                      const cover = discovered.cover ? href(discovered.cover) : ""
                      const play = discovered.itch
                      const genre = discovered.genre || documentedGenre(
                        p.allFiles.find((file) => file.slug === discovered.slug)!, about,
                      )
                      const description = discovered.description.length > 160
                        ? discovered.description.slice(0, 157).replace(/\s+\S*$/, "") + "…"
                        : discovered.description
                      return (
                        <article class="project-card" key={discovered.slug}>
                          <div class={`project-cover cover-${i % 2}`}>
                            {cover ? (
                              <img src={cover} alt={`${discovered.title} cover`} loading="lazy" decoding="async" />
                            ) : (
                              <div class="project-cover-fallback">
                                <span aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                                <small>No public cover supplied</small>
                              </div>
                            )}
                          </div>
                          <div class="project-card-body">
                            {genre && <p class="project-card-genre">{genre}</p>}
                            <h3>
                              <a class="project-card-link" href={href(discovered.slug)}>{discovered.title}</a>
                            </h3>
                            {description && <p class="project-card-description">{description}</p>}
                            <div class="chips" aria-label="Technologies">
                              {discovered.technologies.map((t) => <span key={t}>{t}</span>)}
                            </div>
                            <div class="card-links">
                              <span aria-hidden="true">View project ↗</span>
                              {play && (
                                <a href={play} target="_blank" rel="noopener noreferrer">
                                  {itchActionLabel(discovered.distribution)} ↗
                                </a>
                              )}
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </section>
                <a class="button showcase-view-all" href={href("projects")}>
                  View all projects ↗
                </a>
                <section id="brain" class="graph-preview" aria-labelledby="knowledge-preview-heading">
                  <div class="section-heading">
                    <div>
                      <div class="eyebrow">02 / CONNECTED THINKING</div>
                      <h2 id="knowledge-preview-heading">Explore My Knowledge</h2>
                    </div>
                    <a class="button" href={href("graph")}>
                      View Full Graph <span aria-hidden="true">↗</span>
                    </a>
                  </div>
                  <p>Explore the connections between my public projects, skills, and achievements.</p>
                  {graphView}
                </section>
                <section id="skills" class="home-knowledge-section" aria-labelledby="home-skills-heading">
                  <div class="section-heading">
                    <div>
                      <div class="eyebrow">03 / TOOLKIT</div>
                      <h2 id="home-skills-heading">Skills</h2>
                    </div>
                    <p>Explore the skills behind my projects.</p>
                  </div>
                  <ul class="home-skill-links">
                    {publicNotes("skill").map((file) => (
                      <li key={file.slug}><a href={href(file.slug!)}>{file.frontmatter?.title}</a></li>
                    ))}
                  </ul>
                </section>
                <section id="achievements" class="home-knowledge-section" aria-labelledby="home-achievements-heading">
                  <div class="section-heading">
                    <div>
                      <div class="eyebrow">04 / MILESTONES</div>
                      <h2 id="home-achievements-heading">Achievements</h2>
                    </div>
                    <p>Competition results and project showcases.</p>
                  </div>
                  <div class="home-achievement-grid">
                    {publicNotes("achievement").slice(0, 3).map((file) => (
                      <article class="home-achievement-card" key={file.slug}>
                        <h3><a href={href(file.slug!)}>{file.frontmatter?.title}</a></h3>
                        <span aria-hidden="true">View achievement ↗</span>
                      </article>
                    ))}
                  </div>
                </section>
                <section id="contact" class="home-knowledge-section" aria-labelledby="home-contact-heading">
                  <div class="section-heading">
                    <div>
                      <div class="eyebrow">05 / CONNECT</div>
                      <h2 id="home-contact-heading">Connect With Me</h2>
                    </div>
                    <p>Find my work and get in touch.</p>
                  </div>
                  <div class="hero-actions home-contact-links">
                    {profileLinks(about).map((link) => (
                      <a class="button" key={link.label} href={link.href} target="_blank" rel="noopener noreferrer">
                        {link.label} <span aria-hidden="true">↗</span>
                      </a>
                    ))}
                  </div>
                </section>
              </>
            ) : gallery ? (
              <ProjectsShowcase {...p} root={root} />
            ) : graph ? (
              <>
                <div class="eyebrow">THE PUBLIC SECOND BRAIN</div>
                <h1>Connected thinking.</h1>
                <p>
                  Explore public notes and the links between them. Categories without public notes
                  remain empty.
                </p>
                {graphView}
                <details class="native-graph">
                  <summary>Open the Quartz graph</summary>
                  {right
                    .filter((C) => /graph/i.test(C.displayName ?? C.name))
                    .map((C) => (
                      <C {...p} />
                    ))}
                </details>
              </>
            ) : (
              <>
                <a class="back-link" href={`${href("index")}${project ? "#projects" : ""}`}>
                  ← {project ? "All projects" : "Home"}
                </a>
                <div class="eyebrow">
                  {project ? "PROJECT / DEVELOPMENT NOTES" : "PUBLIC SECOND BRAIN"}
                </div>
                <h1
                  id={
                    typeof p.fileData.portfolioTitleId === "string"
                      ? p.fileData.portfolioTitleId
                      : undefined
                  }
                >
                  {title}
                </h1>
                {project && (
                  <div class="project-metadata">
                    {[
                      "genre",
                      "engine",
                      "engine-version",
                      "platform",
                      "status",
                      "event",
                      "duration",
                      "role",
                    ]
                      .filter((k) => fm[k])
                      .map((k) => (
                        <div>
                          <small>{k.replaceAll("-", " ")}</small>
                          <span>{String(fm[k])}</span>
                        </div>
                      ))}
                  </div>
                )}
                <details class="article-navigation">
                  <summary>On this page &amp; related notes</summary>
                  {right
                    .filter((C) => !/graph/i.test(C.displayName ?? C.name))
                    .map((C) => (
                      <C {...p} />
                    ))}
                </details>
                <Content {...p} />
                {project && <ProjectMedia {...p} root={root} />}
              </>
            )}
          </div>
        </main>
        <footer class="portfolio-footer">
          <div>
            <a class="wordmark" href={href("index")}>
              fz<span>.</span>
            </a>
            <p>Gameplay, systems, and everything I learn along the way.</p>
          </div>
          <div>
            {!home && <span class="eyebrow">Connect With Me</span>}
            {!home && profileLinks(about).map((link) => (
              <a href={link.href} target="_blank" rel="noopener noreferrer">
                {link.label} ↗
              </a>
            ))}
            <a href={href("graph")}>Second Brain →</a>
            <small>© {new Date().getFullYear()} Farhad Zamanov</small>
          </div>
        </footer>
        <script type="module" src={`${root}/static/portfolio.js`} />
        <script type="module" src={`${root}/static/projects-gallery.js`} />
        <script type="module" src={`${root}/static/project-media.js`} />
        <script type="module" src={`${root}/static/video-gallery.js`} />
      </div>
    )
  },
}
