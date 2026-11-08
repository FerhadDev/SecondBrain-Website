import type { QuartzComponentProps } from "../quartz/components/types"
import { discoverProjects } from "./projects"

export function ProjectsShowcase({ allFiles, ctx, root }: QuartzComponentProps & { root: string }) {
  const projects = discoverProjects(allFiles, ctx.allFiles)
  const categories = [...new Set(projects.map((p) => p.category))].sort()
  const href = (slug: string) => `${root}/${slug.split("/").map(encodeURIComponent).join("/")}`
  return (
    <section class="projects-showcase" aria-labelledby="showcase-heading" data-project-gallery>
      <div class="showcase-intro">
        <div class="eyebrow">PROJECTS / PLAYABLE IDEAS</div>
        <h1 id="showcase-heading">
          Experiments.
          <br />
          <span>Made playable.</span>
        </h1>
        <p>
          A collection of games and the systems behind them. Explore my public project notes,
          development work, and game-jam experiments.
        </p>
      </div>
      <div class="showcase-controls" hidden data-gallery-controls>
        <div class="showcase-filter-fields">
          <label>
            Search projects
            <input
              type="search"
              placeholder="Search titles, technologies, or descriptions…"
              autoComplete="off"
              data-gallery-search
            />
          </label>
          <label>
            Category
            <select data-gallery-category>
              <option value="">All categories</option>
              {categories.map((category) => (
                <option value={category} key={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <button type="button" data-gallery-reset>
            Clear filters <span aria-hidden="true">↺</span>
          </button>
        </div>
      </div>
      <div class="showcase-status">
        <p role="status" aria-live="polite" aria-atomic="true" data-gallery-count>
          {projects.length} {projects.length === 1 ? "project" : "projects"}
        </p>
        <span>GAMES / SYSTEMS / GAME JAMS</span>
      </div>
      <div class="showcase-grid">
        {projects.map((project, i) => (
          <article
            class="showcase-card"
            data-gallery-card
            data-category={project.category}
            key={project.slug}
          >
            <a
              class={`showcase-cover ${project.cover ? "has-cover" : `showcase-fallback-${i % 2}`}`}
              href={href(project.slug)}
              aria-label={`View ${project.title}`}
            >
              {project.cover ? (
                <img
                  src={href(project.cover)}
                  alt={`${project.title} cover`}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div class="showcase-cover-fallback">
                  <span class="cover-index" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <strong>{project.title}</strong>
                  <small>No public cover image supplied</small>
                </div>
              )}
              {project.featured && <span class="showcase-featured">Featured</span>}
              <span class="showcase-cover-arrow" aria-hidden="true">
                ↗
              </span>
            </a>
            <div class="showcase-card-body">
              <p class="showcase-category">
                {project.category === "Team" ? "Team Project" : project.category}
              </p>
              {project.status && (
                <p class="showcase-project-status">
                  {project.status.replace(/^./, (c) => c.toUpperCase())}
                </p>
              )}
              {project.genre && <p class="showcase-genre">{project.genre}</p>}
              <h2>
                <a href={href(project.slug)}>{project.title}</a>
              </h2>
              <p class="showcase-description">
                {project.description || "Project overview coming soon."}
              </p>
              <ul class="showcase-technologies" aria-label="Confirmed technologies">
                {project.technologies.map((technology) => (
                  <li key={technology}>{technology}</li>
                ))}
              </ul>
              <div class="showcase-card-links">
                <a href={href(project.slug)} aria-label={`Project details: ${project.title}`}>
                  Project details <span aria-hidden="true">→</span>
                </a>
                {project.itch && (
                  <a
                    href={project.itch}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Play ${project.title} (opens in a new tab)`}
                  >
                    Play game <span aria-hidden="true">↗</span>
                  </a>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
      <div class="showcase-empty" hidden={projects.length !== 0} data-gallery-empty>
        <h2>{projects.length ? "No matching projects." : "Projects are on the way."}</h2>
        <p>
          {projects.length
            ? "Try a different search or clear the filters to see all projects."
            : "Public projects will appear here as their notes are added."}
        </p>
      </div>
      <noscript>
        <p>
          All public projects are shown. Enable JavaScript to search and filter this collection.
        </p>
      </noscript>
    </section>
  )
}
