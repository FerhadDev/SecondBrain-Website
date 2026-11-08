# Adding a game

1. Copy `website/Project.template.md` into your Obsidian Templates directory yourself if desired. The website never writes to the vault.
2. Create a Markdown note anywhere under `D:\SecondBrain\Public\Projects\`. Game-Jam, Personal, Team, Teaching, Other, and future nested folders all work.
3. Set `title`, `type: project`, and `visibility: public`. Fill only confirmed optional metadata. Delete unused template headings. Keep filenames stable to keep URLs stable.
4. Put images and MP4/WebM videos inside Public. Use Public-relative paths in cover/screenshots/videos, for example `Projects/Personal/Attachments/game.webp`. Relative paths from the note and unique basenames also resolve. Missing media produces validation warnings and is omitted. No invented imagery is generated.
5. Add real public wikilinks under Related Knowledge or anywhere in the body. These feed Quartz search, backlinks, and graph edges. Unresolved wikilinks lose both their target and alias. Unsafe Markdown links or raw HTML cause the note to be withheld for review.
6. Run `npm.cmd run dev:brain` in the website folder. It synchronizes, reports validation warnings, builds, and serves http://localhost:8080/projects. Changes inside Public trigger a debounced serialized sync/build; refresh the browser afterward. Ctrl+C stops it. It creates no startup service.

For a single build use `npm.cmd run build:brain`. Validation alone: `npm.cmd run validate:projects`; append `-- --strict` for a failing exit code on warnings. Local diagnostics are in `.obsidian-sync/report.json`; they are outside published content.

## Schema

Required discovery fields: title (nonempty string), type (exactly project), visibility (exactly public). Cards tolerate missing optional fields and fallback to a public filename for a missing title. Legacy notes lacking discovery fields retain their existing Markdown detail URLs but are excluded from cards; add the required fields in Obsidian to opt them in. Legacy metadata for Are You King Enough and Blue Diary is supplied by `website/public-project-metadata.json` during sync, without modifying the vault. These supplements fill missing fields only; explicit source metadata wins. Private/draft/unpublished source notes are rejected before supplements apply, and missing notes are never created. New projects with complete frontmatter need no supplement or website edit.

Optional strings: description, category, status, cover. Category is open-ended; filters are generated from actual metadata. Supported statuses: active, in-development, prototype, released, completed, paused, stopped, discontinued, archived, draft, unpublished. Genre, role, platform, technologies accept strings or lists. Screenshots and videos accept lists of local paths. Featured is boolean; featured_order is a finite number (ascending). Links is a label-to-HTTPS-URL mapping; game/play links appear on cards. Legacy engine, project-type, summary, order and official-url are still read. Only explicit technology metadata or labels are used.

Markdown provides the reusable detail sections: Overview, Gameplay, My Contributions, Technical Implementation, Challenges and Solutions, Lessons Learned, Team Credits, Related Knowledge. Only sections with content are published; placeholder-only sections are removed in the synchronized copy. Screenshots and videos produce a reusable Media Gallery with native video controls; raw iframe embeds are deliberately withheld by the existing HTML review policy.

## Safety and ownership

Only Public is scanned or watched. Private, Templates, hidden files, symlinks/junctions, escaping references, and unsupported extensions are excluded. Any note explicitly marked private, draft, unpublished, encrypted or unlisted is withheld before links resolve. Metadata is allowlisted; unsafe metadata references are stripped. Assets must exist in approved Public inputs. Public assets are public by definition: store private attachments outside Public.

Sync owns only files recorded in its local manifest; other website files are preserved and conflicting unmanaged paths fail rather than overwrite. New/updated/renamed/deleted notes and media are reconciled on each run. A full Quartz build cleans stale generated routes. Renames change URLs using normal Quartz routing; add public aliases yourself when a redirect is wanted. Duplicate titles are reported and keep separate path-based routes.

Tests use temporary repository fixtures, never the vault. No GitHub connection or deployment is part of this workflow.

`project_id` is an optional stable lowercase identifier (for example `blue-diary`). It does not create a route. The theme registry can select a custom presentation by that identifier while Quartz keeps the existing path-based URL. Category `team` is displayed as Team Project and filtered under Team.
