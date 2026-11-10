import { projectTheme } from "./project-themes"
import { PageFrame } from "../quartz/components/frames/types"
import { pathToRoot } from "../quartz/util/path"
import { ProjectMedia } from "./ProjectMedia"
import { discoverProjects } from "./projects"
import { ProjectsShowcase } from "./ProjectsShowcase"
import { itchActionLabel, profileLinks } from "./profile-links"

const plain = (node: any): string =>
  node?.type === "text" ? node.value : (node?.children ?? []).map(plain).join("")
function section(file: any, pattern: RegExp) {
  const nodes = file?.htmlAst?.children ?? []
  const start = nodes.findIndex((n: any) => /^h[23]$/.test(n.tagName) && pattern.test(plain(n)))
  if (start < 0) return ""
  const parts = []
  for (let i = start + 1; i < nodes.length && !/^h[123]$/.test(nodes[i].tagName); i++)
    parts.push(plain(nodes[i]))
  // Cards use the opening paragraph rather than the complete development log.
  const firstParagraph = nodes.slice(start + 1).find((n: any) => n.tagName === "p")
  return firstParagraph ? plain(firstParagraph).trim() : parts.join(" ").trim()
}
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
    const discoveredProjects = discoverProjects(p.allFiles, p.ctx.allFiles)
    const projects = discoveredProjects.map((project) =>
      p.allFiles.find((f) => f.slug === project.slug)!,
    )
    const title = p.fileData.frontmatter?.title
    const fm = { ...p.fileData.frontmatter, genre: documentedGenre(p.fileData, about) } as Record<
      string,
      any
    >
    const graphView = (
      <div class="brain-graph" data-index={`${root}/static/contentIndex.json`}>
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
        <div class="graph-legend">
          {["Projects", "Skills", "Achievements", "Knowledge"].map((x) => (
            <span data-category={x}>{x}</span>
          ))}
        </div>
        <svg viewBox="0 0 1000 500" role="img" aria-label="Interactive public knowledge graph" />
        <p class="graph-hint">Scroll to zoom · drag to pan · select a node to open its note</p>
        <ul class="graph-note-list" aria-label="Public notes">
          {p.allFiles
            .filter((f) => f.slug?.startsWith("brain/") && !f.slug.endsWith("/index"))
            .map((f) => (
              <li>
                <a href={href(f.slug!)}>{f.frontmatter?.title}</a>
              </li>
            ))}
        </ul>
        <noscript>
          Enable JavaScript for the interactive graph. Public note links are available above.
        </noscript>
      </div>
    )
    return (
      <div class={`portfolio-shell ${theme?.className ?? ""}`}>
        <a class="skip-link" href="#main-content">
          Skip to content
        </a>
        <header class="portfolio-nav">
          <a class="wordmark" href={href("index")}>
            fz<span>.</span> <small>Farhad Zamanov</small>
          </a>
          <nav aria-label="Main navigation">
            <a href={href("index")}>Home</a>
            <a href={href("projects")} aria-current={gallery ? "page" : undefined}>
              Projects
            </a>
            <a href={`${href("index")}#skills`}>Skills</a>
            <a href={href("graph")}>Knowledge Graph</a>
            {about && <a href={href(about.slug!)}>About</a>}
            <a href="https://github.com/FerhadDev" target="_blank" rel="noopener noreferrer">
              GitHub ↗
            </a>
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
                  <div class="eyebrow">GAMEPLAY PROGRAMMING / GAME MECHANICS</div>
                  <h1>
                    Ideas into systems.
                    <br />
                    Systems into <span>play.</span>
                  </h1>
                  <p class="hero-role">
                    Farhad Zamanov <span>— Game Developer &amp; Game Designer</span>
                  </p>
                  <p class="hero-intro">
                    I design gameplay experiences, develop interactive systems, and turn creative
                    ideas into playable games. My primary tools are Unity and C#.
                  </p>
                  <div class="hero-actions">
                    <a class="button primary" href="#projects">
                      Explore Projects <span>↗</span>
                    </a>
                    <a class="button" href={href("graph")}>
                      Explore My Brain <span>→</span>
                    </a>
                    <a class="text-link" href="https://github.com/FerhadDev">
                      GitHub ↗
                    </a>
                  </div>
                  <div class="hero-bottom">
                    <span>CODE + DESIGN + CURIOSITY</span>
                    <span>SCROLL TO EXPLORE ↓</span>
                  </div>
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
                    {projects.map((f, i) => {
                      const meta = f.frontmatter as Record<string, any>
                      const overview = section(f, /^(Project overview|Overview)$/i)
                      const discovered = discoverProjects([f], p.ctx.allFiles)[0]
                      const cover = discovered.cover ? href(discovered.cover) : ""
                      const technologies = discovered.technologies
                      const play = discovered.itch
                      return (
                        <article class="project-card">
                          <a
                            class={`project-cover cover-${i % 2}`}
                            href={href(f.slug!)}
                            aria-label={`View ${meta.title}`}
                          >
                            <span>PROJECT / {String(i + 1).padStart(2, "0")}</span>
                            <strong>{meta.title}</strong>
                            {cover ? (
                              <img src={cover} alt={`${meta.title} screenshot`} loading="lazy" />
                            ) : (
                              <small>No public cover image supplied</small>
                            )}
                          </a>
                          <div class="project-card-body">
                            <div class="eyebrow">
                              {discovered.category === "Team"
                                ? "Team Project"
                                : discovered.category}{" "}
                              / {discovered.genre || documentedGenre(f, about) || "Project"} ·{" "}
                              {meta.platform ?? ""}
                            </div>
                            <h3>
                              <a href={href(f.slug!)}>{meta.title}</a>
                            </h3>
                            <p>{discovered.description || overview}</p>
                            <div class="chips">
                              {[
                                ...technologies,
                                ...(discovered.status
                                  ? [discovered.status.replace(/^./, (c) => c.toUpperCase())]
                                  : []),
                                ...(Array.isArray(meta.style) ? meta.style : []),
                              ].map((t) => (
                                <span>{t}</span>
                              ))}
                            </div>
                            <div class="card-links">
                              <a href={href(f.slug!)}>Project details →</a>
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
                <section id="skills">
                  <div class="section-heading">
                    <div>
                      <div class="eyebrow">02 / TOOLKIT</div>
                      <h2>The tools behind the play.</h2>
                    </div>
                    <p>Skills documented in my public developer profile.</p>
                  </div>
                  <div class="skills-grid">
                    {skills(about).map((group, i) => (
                      <div class="skill-card">
                        <span class="eyebrow">0{i + 1}</span>
                        <h3>{group.title}</h3>
                        <ul>
                          {group.items.map((item) => (
                            <li>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>
                <section id="brain">
                  <div class="section-heading">
                    <div>
                      <div class="eyebrow">03 / CONNECTED THINKING</div>
                      <h2>A look inside my Second Brain.</h2>
                    </div>
                    <a class="button" href={href("graph")}>
                      Open full graph ↗
                    </a>
                  </div>
                  <p>
                    A living collection of public projects and knowledge. Every connection comes
                    from a real note.
                  </p>
                  {graphView}
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
            <span class="eyebrow">Connect With Me</span>
            {profileLinks(about).map((link) => (
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
