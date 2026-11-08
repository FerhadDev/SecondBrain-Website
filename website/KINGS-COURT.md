# Are You King Enough: The King's Court

The existing route `/brain/projects/game-jam/are-you-king-enough` is rendered by `KingsCourt.tsx` through the shared public-project theme registry. Its stable ID remains `are-you-king-enough`. This is a presentation variant, not a new project record. Gallery discovery, search, real graph links and Public-only synchronization remain the normal pipeline. The Obsidian vault is never modified.

## Design and artwork

The royal-court theme uses the six owner-supplied PNG screenshots embedded in the public project note. The first is the official title artwork; the others show the illustrated court and dialogue. All original compositions are preserved with `object-fit: contain`, expandable native galleries and original-file links. Character scenes are shown intact without invented names or cropped-out context. The first image is also the project cover.

The palette is interpreted from those images: warm parchment `#e9d7af`, muted gold `#c5a264`, royal red `#91383e`, castle purple `#211923`, and deeper purple `#170f1b`. Georgia headings and system body fonts keep the page readable without new font dependencies. Gradients progressively deepen through sections. Supporting browsers also animate a background glow with a CSS view timeline; reduced-motion users receive a static atmosphere. No full-screen filters, scroll listeners or canvas effects are used.

## Content and media automation

`content.ts` reads sections from Quartz's sanitized HTML tree. Contributions, team, role, jam, duration, result, engine and tools come from the existing project note or validated metadata. Undocumented language and learning/challenge claims are omitted. Result attribution and contribution-evidence limitations remain explicit.

`CourtMedia.tsx` provides expandable image/GIF galleries and `ProjectVideo`. Approved media is resolved only against synchronized Public assets, from metadata and embedded Markdown. Native video controls are muted initially, play inline, and never request autoplay by default. `preview: true` opts a short clip into muted looping. `quartz/static/project-media.js` pauses clips offscreen or on hidden tabs, disables automatic previews under reduced motion, and resets observers on Quartz navigation. Without JavaScript or IntersectionObserver, native controls still work.

No Are You King Enough MP4/WebM or GIF assets are currently supplied. Their rendering, safe resolution and visibility/motion behavior are covered by fixture tests; actual game-clip playback cannot be checked until clips exist. Standalone character sheets, a separate transparent title logo and contribution-specific captures are also missing. No replacements are generated. The Play Game link uses the owner's supplied itch.io URL; the external page could not be independently fetched during implementation.

The sync section sanitizer preserves blank lines between paragraphs and lists while removing placeholder-only sections; this prevents credits and technical notes from becoming part of a contribution list.

## Checks and preview

Run `npm.cmd run build:brain`, `npm.cmd test`, `npx.cmd tsc --noEmit`, `node scripts/validate-brain.mjs`, `node scripts/validate-portfolio.mjs`, and `node scripts/check-kings-court-browser.mjs`. Browser screenshots are stored under ignored `.quartz/kings-court-preview/`. Existing Blue Diary and gallery browser checks also cover theme isolation.

Start `npm.cmd run dev:brain` and open `http://localhost:8080/brain/projects/game-jam/are-you-king-enough`. Nothing is deployed or pushed.
