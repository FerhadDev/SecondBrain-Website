# Project Status

## Architecture
- Existing Quartz 5 site; TypeScript/Preact components and HTML/SCSS styling.
- `quartz.config.yaml` selects `website/PortfolioFrame.tsx`; registration lives in `quartz/components/frames/index.ts`.
- Website styling: `quartz/styles/custom.scss` and `website/` component/theme styles.
- `scripts/sync-obsidian.mjs` imports only approved `D:\SecondBrain\Public` content into sync-managed `content/brain/`.
- Website-owned pages include `content/index.md`, `content/graph.md`, and `content/projects.md`.
- Project metadata, media, gallery components, and custom themes live in `website/`.

## Completed features and work
- Portfolio frame, dynamic project gallery, native search, and interactive public knowledge graph.
- Custom Blue Diary and Are You King Enough project pages; responsive image/video components and poster tooling.
- Tengri synchronized as a Game Jam project (stopped): artwork-inspired theme, five screenshots, full-size links, source gameplay table, credits, public links and YouTube link.
- Four projects are dynamically discovered; Tengri cover uses the existing website metadata supplement without editing the vault.
- Public-content synchronization with link sanitization, exclusions, and private local reports.
- Existing synchronization, project, graph, and browser-check scripts are available.
- Consolidated project instructions and created this status file; application code unchanged by this documentation task.
- GitHub preparation audit recorded in `GITHUB_PREPARATION.md`; hardened ignore rules, retained Git history/remotes, and preserved all website content.
- First-commit preparation: owner-confirmed project Pages base URL, disabled publishing/auto-merge jobs, corrected future-sync Blue Diary cover, and Pages-aware link validation. Exact candidate files in `FIRST_COMMIT_FILES.txt`; current findings in `PUBLICATION_READINESS.md`.
- Pages technical preparation: CNAME disabled; dedicated v5-push/manual workflow with automatic Pages enablement disabled; vault-independent `build:pages` and repository privacy gate. Hosted validation needs no local sync reports.
- Public automation: `brain:watch`, `brain:sync`, `brain:publish` reuse public sync. Debounced serialized watcher, transactional rollback/last-valid preview, content-only publishing with interactive confirmation and remote-tip checks. Existing `dev:brain` preview reuses it. Instructions: `SYNC_WORKFLOW.md`; no service or unattended publishing enabled.
- Homepage updates: metadata-driven download/browser/view labels, public-profile-derived contact links including LinkedIn, safe LinkedIn URL normalization, and typed public skill/achievement schema/index tags. Graph edges still come only from real public links. Copy-ready owner edits/templates: `website/PUBLIC_NOTE_EDITS.md`.

## Current problems
- Tengri integration: full build, TypeScript, 7 sync/privacy tests, 20 project/theme tests, local-link/portfolio/graph checks and desktop/mobile browser checks passed.
- Three unavailable source references remain safely sanitized; public sync imports the cleaned About Me without its internal checklist. Vault files were not edited.
- Owner confirmed public About Me facts, project credits and all previously flagged game media/posters.
- Final cleanup: sync output now normalizes EOF blank lines with regression coverage; four project notes lose only trailing blank lines. Ten privacy/sync tests, Pages build and 1,265 generated-link checks pass; staged whitespace warnings resolved. Staged proposal remains 104 paths.
- Final bug-fix verification: 48 tests, TypeScript, Pages build (113 files, no CNAME), 1,265 local links and browser checks pass. All four games have one H1; 320/390px layouts, images, Blue Diary playback/fullscreen/keyboard/posters, search, graph and gallery filters work with no console errors.
- Tengri has no local video, lessons-learned content, or exact Unity version; no details were invented.
- Existing unrelated tracked changes and untracked application files were present and preserved.
- Automation review: 22 privacy/sync/watcher/publisher tests and 23 project/theme/media tests passed; full Pages build, four rendered games and 1,265 local-link/graph checks passed. Hardened rollback against diagnostic failures, bound publishing to the validated snapshot, and wait for build-child shutdown. Git publishing tests use mocked mutations; no push/deployment or vault edits performed.
- Fixture-directory CI error resolved: automatic Pages run 42646983930 for 401ed04 completed successfully. Live homepage, all four games and content index return HTTP 200; live gallery initializes and graph renders five public nodes. No deployment was initiated by this check.
- Mermaid fix: PortfolioFrame supplies a `.center` scope with `display: contents`, preserving layout and the installed initializer/native graph. Real diagram rendering and seven routes pass browser console checks; Quartz core and dependencies unchanged.
- Website-only presentation transform removes the matching leading project H1 while preserving its anchor on the frame title. Verified 404 GameJamPlus reference has no official replacement on the owner's public repo list or itch.io page; generated HTML/search marks it unavailable. Approved Public source and synchronized Markdown remain unchanged. Three absent knowledge links remain safely sanitized.
- Read-only Public sync into local diagnostics produced 23 safe files/four valid projects identical to the website snapshot. Watcher/publisher safety, rollback, lock handling and shutdown pass fixture tests; no real publish attempted. Existing local project-note edit preserved.
- Homepage foundations passed 53 tests. Owner has since supplied real Public notes: graph now has 17 public nodes, including six skills and three achievements, with real About Me/project links; Redactor is additionally discovered as a public project. No synthetic nodes or vault edits.
- Escaped table wikilink fix: alias splitting now consumes the optional table-escape backslash and preserves literal label pipes as escaped Markdown. Regression covers normal/aliased/table/relative/fragment links, missing/private/excluded targets, legacy sanitization, table structure and repeat sync. 25 tests, public validation, Pages build (147 files), 2,167 local links, graph filters and existing game/browser checks pass; only the original three unavailable project references remain.
- Hub collision resolved in website-owned `hub-routing.ts`: authored public non-project introductions are reused on matching generated folder indexes, with rebased links and existing child listings. Skills/Achievements source names, canonical note slugs, graph nodes and vault structure are unchanged. Matching public H1s use the frame title. Gallery browser expectations now discover all five public projects dynamically; outdated note-edit guidance is marked historical.
- Publication review: 56 unit/privacy/automation tests, TypeScript, Pages build (147 files), 2,182 internal links, graph interactions and desktop/320/390px browser checks pass. Authored hub routes, four original games, homepage contacts/download label, search, Mermaid, images and video controls pass; no relevant console errors. All 42 pending files scanned without private paths, symlinks, secret patterns or oversized files. Three legacy unavailable references remain sanitized; nonfatal content Git-date warning only.

## Next task
- Homepage, public knowledge-note, parser and hub-routing release approved for one local commit after staged privacy/whitespace checks. Unrelated King-note indentation remains unstaged. Push/deployment require separate authorization; vault unchanged.
