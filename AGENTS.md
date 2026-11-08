# Second Brain Website - Codex Rules

## Project
- Existing Quartz 5 website using TypeScript, Preact, HTML/CSS; never initialize again.
- Website: `D:\SecondBrain-Website`; vault: `D:\SecondBrain`.
- Approved content source: `D:\SecondBrain\Public`.
- Preserve synchronization, search, knowledge graph, dynamic gallery, and custom project pages.

## Efficient work
- Read `PROJECT_STATUS.md` first when continuing work.
- Search filenames and symbols with `rg` before opening files; read relevant sections only.
- Exclude `node_modules/`, `public/`, `.git/`, build output, and caches unless needed.
- Never recursively read the whole repository or repeatedly inspect unchanged files.
- Avoid repeated instructions, plans, large logs, and unnecessary web searches.
- Use installed code and local documentation when sufficient.
- Use subagents only when explicitly authorized and clearly beneficial.
- Do not repeat failed commands without changing the approach.
- Focus on the requested feature; make small, incremental, reversible changes.
- Reuse Quartz components and styles; prefer simple solutions and existing dependencies.
- Do not refactor unrelated code or rewrite working components without a clear reason.
- Preserve existing URLs, integrations, functionality, and unrelated user changes.
- Make reasonable reversible decisions; ask only when missing information affects implementation.

## Obsidian safety
- Never modify the vault unless explicitly authorized; never read or publish Private notes.
- Never copy the entire vault or expose private note names, paths, or attachments.
- Synchronize only approved public content; preserve public wikilinks and media.
- Never overwrite synchronized Markdown with website-only changes.
- `content/brain/` is sync-managed; keep website-owned changes outside it.
- Keep `.obsidian-sync/` reports outside published content.

## Project pages
- Reuse the existing custom-page architecture; each game may have its own theme/layout.
- Preserve Blue Diary, Are You King Enough, and other existing project pages.
- Preserve metadata-driven project discovery; do not hardcode new registrations.
- Use actual screenshots/videos; never invent project information or artwork.
- Keep media responsive and performant.

## Verification and dependencies
- Run the smallest relevant checks first; do not run unrelated test suites.
- Run a full Quartz build after rendering, routing, or synchronization changes.
- Documentation-only changes need targeted content/diff checks, not a build.
- Avoid repeated full builds without intervening changes.
- Never bypass privacy/security validation or claim checks ran when they did not.
- Report failures briefly with relevant errors; obey task-specific verification limits.
- Never reinstall Quartz or run `npm audit fix --force`.
- Run `npm install` only if dependencies changed or are missing.
- Do not commit, push, or deploy unless requested.
- Review changed files before potentially destructive operations.

## Completion and memory
- Keep responses concise: decisions, changes, blockers, and verification results only.
- Final response: **Changed**, **Tested**, **Issues**; add **Next** only when useful.
- Stay under approximately 150 words unless the user requests another format or detail.
- Maintain root `PROJECT_STATUS.md` under 80 lines; update only for meaningful state changes.
- Record architecture, completed features/work, known problems, and next task only.
- Keep this file under 100 lines; merge useful rules without duplication.
- Check applicable `AGENTS.md` and `AGENTS.override.md` before editing scoped files.
