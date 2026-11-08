# Portfolio redesign

The site uses a website-owned Quartz page frame in `website/PortfolioFrame.tsx` and responsive styles in `quartz/styles/custom.scss`. `quartz.config.yaml` selects the frame, applies Farhad Zamanov branding and a dark palette, moves native search into the header, and hides properties while retaining frontmatter parsing.

The only core edit is two lines in `quartz/components/frames/index.ts`: import and register the portfolio frame. This avoids changing Quartz rendering, page types, transformers, indexing, or synchronization. Retain this registration when upgrading Quartz.

## Pages and content

- `/`: portfolio hero, two dynamic public project cards, skill groups extracted from the public About Me technical-skills section, and graph preview.
- `/graph`: SVG graph built from Quartz's existing public content index, with search, category filter, zoom, pointer pan, focus/hover highlighting, reset, and accessible note links. The native Quartz graph is also retained in a disclosure.
- Existing project URLs: reusable metadata, readable original Markdown, collapsed table of contents and backlinks, and unchanged source sections. Undocumented details remain marked in the original notes.
- Project cards use the first overview paragraph, existing itch.io URLs, documented technologies, and local Markdown images when supplied. The current public notes contain no images, so text cover panels explicitly identify their absence. No screenshots were invented.
- Graph categories derive from public note folder paths (Projects, Skills, Achievements; other notes use Knowledge). Only three actual notes exist now. Generated folder/tag pages are omitted from the custom graph; no nodes or edges are invented.

`content/index.md` and `content/graph.md` belong to the website. Never manually edit `content/brain`: it is regenerated from the approved Public folder. No synchronization script or npm script was changed for the redesign. No new dependencies were added. No files in the Obsidian vault were edited. Nothing was deployed or connected to GitHub.

## Validation

Run in PowerShell from `D:\SecondBrain-Website`:

```powershell
npm.cmd run build:brain
npm.cmd run test:obsidian
npx.cmd tsc --noEmit
node scripts/validate-brain.mjs
node scripts/validate-portfolio.mjs
node scripts/test-portfolio-graph.mjs
```

The graph interaction check uses a DOM simulation; it does not verify browser rendering. Generated HTML checks cover card/skill counts, native search and graph markup, project metadata, public-index membership, real graph targets, and generated local link destinations.

HTTP preview checks returned 200 for home, graph, About, both project URLs, content index and graph script. No browser automation tool was available, so desktop/mobile visual appearance, native search interaction, and actual pointer/touch behavior still need a browser review. Responsive CSS includes tablet/mobile breakpoints, wrapping navigation, stacked project cards, readable article widths, focus states, and reduced-motion support.

The build warns that Google Fonts cannot be downloaded for social preview generation and uses Arial. Three unresolved source wikilinks are already sanitized by synchronization; see `.obsidian-sync/report.json`. They are intentionally not reconstructed. Existing source notes contain verification checklists and undocumented details; those remain unchanged.

## Local preview

```powershell
npm.cmd run dev:brain
```

Open the local address printed by Quartz (normally `http://localhost:8080`). Check `/`, `/graph`, `/brain/about-me`, and both `/brain/projects/game-jam/` project routes. Search is accessible from the magnifying-glass button or Ctrl/Cmd+K. Stop the preview with Ctrl+C. The `.cmd` suffix avoids this machine's PowerShell script-execution restriction.
