# Blue Diary: cinematic video layout

Blue Diary keeps its existing route and custom notebook theme. `FeaturedVideoPlayer.tsx` supplies one native video player per showcase with accessible selection buttons, status text and fullscreen. `ContributionMediaCard.tsx` places explicitly matched footage beside its documented contribution. Components receive resolved media data and contain no project file paths.

## Current media map

All three recordings are owner-supplied Public assets. All are 1920 x 1080 (16:9).

| Original source filename                     | Duration     | Size               | Placement / observed content                                                                  |
| -------------------------------------------- | ------------ | ------------------ | --------------------------------------------------------------------------------------------- |
| `Blue_Diary_Repaired_Optimized.pptx.mp4`     | 102.101 s    | 25,555,501 bytes   | Featured presentation, containing gameplay and presentation slides                            |
| `Blue_Diary_Repaired_Optimized.pptx (1).mp4` | 5 s          | 5,059,508 bytes    | Playlist: room interaction and the diary opening                                              |
| `Blue_Diary_Repaired_Optimized.pptx (2).mp4` | 6 s          | 7,226,101 bytes    | Playlist: timed interaction and outdoor/interior movement                                     |
| Original presentation, 00:44 to 01:01        | 17 s excerpt | Same original file | Puzzle contribution; explicitly labeled as game footage, not individual contribution evidence |

No supplied clip demonstrates the interactive piano or disc-based music player. Those are dedicated text-led cards, ready for an explicitly matching recording. No footage is attributed to either mechanic by filename or keyword inference. No GIFs are supplied. The hero keeps the approved warm-room still. Concept and animation sheets remain in the character/art galleries, separately from videos.

The original embedded file references remain in the synchronized note. `website/project-media.json` annotates known footage and identifies the two existing character sheets, correcting reliance on changing note image order. Source frontmatter metadata takes priority over configuration. Existing presentation slides, credits, watermarks and gameplay are preserved; they are not rewritten or hidden.

## Layout and playback

Desktop: a large featured player with a compact preview panel. Tablet: a large player and three-column preview row. Mobile: full-width player and horizontally scrollable previews. The puzzle card uses a compact instance alongside its explanation. Native fullscreen, volume, seeking and play/pause remain available; the excerpt clamps playback to its documented range.

No primary video loads until play or deliberate selection. Players use `preload="none"` initially, then metadata loading. Posters and preview frames preserve aspect ratios. Switching pauses the previous source and does not autoplay the next. Starting a recording pauses other videos on the page. Players pause offscreen and on hidden tabs. Keyboard arrows, Home/End, Tab and native buttons work. Switching animation is disabled under reduced motion. Without JavaScript, original recording links remain available.

Decorative mode is separate from primary recordings. It can opt into muted, inline looping through `autoplay_preview` and `loop`; the shared media controller respects reduced motion and visibility. Decorative previews do not interrupt an active featured recording.

## Adding future clips

Add a public MP4/WebM and embed it in the Public project note, or use a frontmatter `videos` list. New clips enter the general playlist without component changes. Unknown footage gets a neutral title; no mechanic is inferred. Nothing writes to the vault.

Strings remain supported. Optional mappings:

```yaml
videos:
  - src: Attachments/your-recording.mp4
    poster: Attachments/your-approved-poster.jpg
    title: "A confirmed title"
    description: "A factual caption"
    category: gameplay
    display_mode: playlist
    autoplay_preview: false
    loop: false
```

Optional `display_mode` values: featured, playlist, contribution, decorative. Categories for Blue Diary contribution cards: puzzle, piano, music. Only explicitly assigned contribution recordings appear beside those cards; unclassified clips remain general. Optional `start`/`end` specify a verified excerpt; `poster_time` selects an actual frame during poster preparation. Validation reports malformed mappings and unsafe/missing sources. Missing optional fields fall back safely. Posters must be approved local images, never arbitrary URLs or private files.

## Poster generation

Existing posters were extracted from the actual recordings with the installed Chromium decoder, because FFmpeg is not installed. Four 960 x 540 JPEGs cover three recordings and the puzzle excerpt. `website/project-video-posters.json` records source hashes, dimensions, durations and sizes. Assets live under `content/project-media/posters/`, outside the sync-owned directory. This namespace contains generated media only and creates no new note routes.

Optional refresh:

```powershell
npm.cmd run sync:obsidian
npm.cmd run media:posters
npm.cmd run build:brain
```

The preparation command reads only synchronized Public assets, rejects symlinks/traversal, reuses unchanged posters, and prunes only its own neutral hash-named files. Normal synchronization also withdraws generated posters when their source is removed from Public or its bytes change, so stale derivatives are not left published. It requires an installed Chromium browser (`GALLERY_BROWSER` may select one). Ordinary build/preview requires no browser-based preparation. If a poster is missing, the client lazily decodes one real frame, serially, when its preview enters view. If decoding is unavailable, the notebook-style fallback remains; video playback controls are still available.

## Verification

`npm.cmd test`, `npx.cmd tsc --noEmit`, `npm.cmd run build:brain`, `node scripts/validate-brain.mjs`, `node scripts/validate-portfolio.mjs`, and `node scripts/check-blue-diary-video-browser.mjs` cover normalization, privacy, optional metadata, poster fallback, real clip playback, switching/pausing, native fullscreen, keyboard selection, excerpt bounds and responsive layouts. Browser captures are in ignored `.quartz/blue-diary-video-preview/`.

Preview: `http://localhost:8080/brain/projects/team/blue-diary#diary-world` after `npm.cmd run dev:brain`. No deployment or GitHub operation is part of this workflow.
