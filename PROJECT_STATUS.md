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
- Pages technical preparation: CNAME disabled; manual-only dedicated workflow with automatic enablement disabled; vault-independent `build:pages` and repository privacy gate. Hosted validation no longer needs local sync reports.

## Current problems
- Tengri integration: full build, TypeScript, 7 sync/privacy tests, 20 project/theme tests, local-link/portfolio/graph checks and desktop/mobile browser checks passed.
- Three unavailable source references remain safely sanitized; public sync imports the cleaned About Me without its internal checklist. Vault files were not edited.
- Owner confirmed public About Me facts, project credits and all previously flagged game media/posters.
- Final cleanup: sync output now normalizes EOF blank lines with regression coverage; four project notes lose only trailing blank lines. Ten privacy/sync tests, Pages build and 1,265 generated-link checks pass; staged whitespace warnings resolved. Staged proposal remains 104 paths.
- Latest snapshot build passed (113 output files, no CNAME), 9 privacy/sync and 23 project/media tests passed, plus graph and 1,265 local-link checks. GitHub runner and remote Pages/account settings remain unverified; no vault access, deployment or settings changes during technical preparation.
- Tengri has no local video, lessons-learned content, or exact Unity version; no details were invented.
- Existing unrelated tracked changes and untracked application files were present and preserved.

## Next task
- First-commit files staged for owner review; await explicit commit/push approval. Remote main contains a separate README-only root commit; local v5 remains shallow. Preserve remote main and reconcile default-branch history separately before Pages deployment.
