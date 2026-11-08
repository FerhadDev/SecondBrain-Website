# Blue Diary presentation

The existing public route `/brain/projects/team/blue-diary` uses a diary theme selected by `website/project-themes/index.ts`. The registry is presentation-only: it creates no pages and never bypasses synchronization, visibility, draft, or encryption rules. Other project routes retain the normal layout. Search and graph still use the synchronized Markdown and its real links. No vault files are modified.

## Visual direction

The supplied public concept page, animation spread and gameplay still inform the paper, blue binding, olive clothing, warm fireplace, and dark room palette. Colors are visually interpreted from the references: paper `#d8c9ae`, light paper `#f0e6d2`, brown ink `#453b30`, notebook blue `#344e73`, olive `#535c3b`, fireplace orange `#c18145`, background `#202621`. Georgia provides locally available editorial serif headings, with Segoe UI/Arial body text. CSS creates paper lines, stitched edges and restrained page rotations; no new game artwork is generated.

## Media

All three originals come from images embedded in the approved Public Blue Diary note. The resolver accepts only files present in Quartz's synchronized public inputs, rejects private/template/hidden/traversal paths, and uses Quartz's asset slugging. It supports frontmatter screenshots/videos and sanitized rendered Markdown images.

Current image order in the note: Mövlud concept sheet, shared Mövlud/Ziver animation spread, gameplay still. Keep this order and append further images; the hero uses the third image or an explicit valid cover. Both character references retain the complete original compositions. No sprite crops are invented. The shared animation sheet includes both characters. Gallery items expand with native accessible details/summary controls and link to the full original. The screenshot's embedded play button and Windows activation watermark are part of the supplied still; no video playback is implied.

Useful future additions: a clean gameplay capture, actual gameplay video, and separate piano/puzzle/music-player captures with confirmed technical notes. Do not fill contribution media or learning sections with guesses. Exact development dates, program name, and engine version remain unconfirmed and are not presented as facts.

## Status and verification

The current source note explicitly says `visibility: public`, so the theme is integrated into that existing public-build route. Nothing is deployed. Changing the note to private removes its generated page/search/graph entry through the existing sync/build pipeline. The repository-owned public metadata supplement supplies title/type, the approved project facts, a stable `blue-diary` identifier and the gameplay cover during sync. The note now enters the normal gallery, homepage, search, and graph pipeline without a duplicate page. Explicit source privacy flags always take precedence.

Preview with `npm.cmd run dev:brain`, then visit `http://localhost:8080/brain/projects/team/blue-diary`. Build with `npm.cmd run build:brain`. Run `npm.cmd test`, `npx.cmd tsc --noEmit`, `node scripts/validate-brain.mjs`, and `node scripts/check-blue-diary-browser.mjs`. The browser script uses an installed Chromium browser and stores screenshots under ignored `.quartz/blue-diary-preview/`.
