# GitHub preparation audit — 2026-11-09

Follow-up: see `PUBLICATION_READINESS.md` and `FIRST_COMMIT_FILES.txt` for the latest preparation results. The Git state and findings below describe the original audit; origin has since been changed outside this preparation turn, Pages configuration is now owner-confirmed, and publishing jobs are explicitly disabled. The later-command example below is historical: do not repeat repository creation or origin changes without checking current state.

## Git state

- Branch `v5`, HEAD `97a2d05f80c4c50534959b1d0d41cc4b3895625e`.
- Both `origin` and `upstream` point to `https://github.com/jackyzha0/quartz.git`.
- Shallow clone: one reachable commit, matching `origin/v5`; no local commits.
- Before preparation: 296 tracked paths, five modified files (including `.gitignore`), deleted `content/.gitkeep`, and 87 untracked files. Nothing staged.
- Existing work includes portfolio styles/components, configuration, synchronization scripts, public notes, media and tests. All preserved.
- No commits, staging, remote changes, pushes, deployments, or history changes performed.

## Findings and publication gates

1. No credential values found by pattern scanning candidate text files and text files in the single available commit. The only credential-like assignment was an upstream documentation placeholder in `docs/configuration.md:36`. Earlier upstream history is unavailable locally and was not audited. This is a heuristic scan, not proof that every possible secret is absent; binary contents/metadata were not inspected for secrets.
2. No Private directory was read. Candidate paths contained no Private notes or Obsidian configuration. All 18 synchronized attachments matched SHA-256 hashes of their exact counterparts under the approved Public root. The four generated JPEG posters are registered in `website/project-video-posters.json`; keep them because project pages use them. Public provenance does not establish third-party media rights: verify permission to publish team artwork, credits and presentation footage.
3. Three Blue Diary MP4s are 5,059,508, 7,226,101 and 25,555,501 bytes (37,841,110 total). Preserve them for working pages; none exceeds 50 MB. They will increase clone size. `quartz/util/emojimap.json` is an upstream source dependency of 15,304,987 bytes, not disposable output.
4. `content/brain/About-Me.md` includes an unchecked Publication Verification Checklist covering education, achievements and project claims. It publishes a real name, education and team affiliations. Resolve the checklist in the approved Public source before resynchronizing; do not edit the synchronized copy. Public notes also contain contributor credits and external profile links.
5. Local drive paths occur in `AGENTS.md`, `PROJECT_STATUS.md`, sync/dev scripts and project documentation. They identify the approved vault location, without credentials. Keep the sync allowlist intact; review whether publishing those non-secret machine details is acceptable. Upstream code also contains generic local-path examples.
6. `quartz.config.yaml` has `baseUrl: SecondBrain`; choose the actual site URL before deployment. `npm run build:brain` requires the local approved vault; a future hosted build should build the committed public snapshot rather than attempt local vault synchronization.
7. All inherited workflow jobs are guarded for `jackyzha0/quartz`; they do not deploy this account's website. They include Cloudflare deployment, container publication and auto-merge logic. Secret references are placeholders, not stored values. Leave guards intact until deliberately replacing upstream automation. No hosting workflow was added. Upstream README, funding and package repository metadata still describe Quartz; customize presentation separately while retaining its MIT license and attribution.
8. Existing status records three unresolved synchronization links; resolve or explicitly accept them before publication.

## Repository structure and ignore preparation

Keep `quartz/` (engine and local extensions), `website/` (portfolio components, metadata, themes, tests), `scripts/`, required root configuration, `package.json`, `package-lock.json`, and `LICENSE.txt`. Keep website-owned Markdown under `content/`, the approved synchronized snapshot under `content/brain/`, and referenced posters under `content/project-media/`. Source documentation/tests can stay; they are not generated website output. Keep local diagnostics outside `content/`.

Updated `.gitignore` to stop ignoring itself and to exclude environment secrets, key files, local account/tool directories, case-insensitive Private directories, logs, temporary files, coverage and browser reports. Existing dependency/build/cache/sync-report exclusions remain. Do not blanket-ignore MP4s or posters: that would break current project media. Ignore rules do not remove already tracked files; the tracked-file audit remains necessary.

## History recommendation

Retain Quartz history: no personal commit or credential-bearing commit was identified, and ancestry supports future upstream updates. A fresh history is optional branding cleanup, not a security requirement established by this audit. Do not delete `.git` or initialize this existing site again. Keep upstream's license regardless of history choice. Fetching full history later expands the audit scope; scan it before making the new repository public.

## Exact later commands (not executed)

After resolving the gates above, use installed GitHub CLI authenticated as `FerhadDev`. The proposed repository name is `SecondBrain-Website`; create it private first. These commands intentionally commit, change origin and push only when you later choose to run them. The unshallow fetch restores ancestry needed for an ordinary push; pause afterward to audit newly fetched history before proceeding.

```powershell
Set-Location D:\SecondBrain-Website
gh auth status
git fetch --unshallow upstream
# Audit the newly available history before continuing.
git add --dry-run --all
git add --all
git diff --cached --stat
git diff --cached --check
git diff --cached
# Review staged content before committing.
git commit -m "Add public Second Brain portfolio"
git branch -m main
gh repo create FerhadDev/SecondBrain-Website --private --description "Public Second Brain portfolio built with Quartz"
git remote set-url origin https://github.com/FerhadDev/SecondBrain-Website.git
git push -u origin main
```

Keep `upstream` unchanged. Do not run Quartz sync commands that push until origin has been corrected. Making the repository public and deploying the website are separate later decisions.

## Verification

- Inspected tracked and non-ignored untracked candidates: 383 paths before preparation, 343 text files; deleted files were skipped when reading the working tree.
- Pattern-scanned the available historical snapshot, including tracked files unchanged in the working tree.
- Verified 18/18 synchronized media files against approved Public counterparts.
- Seven isolated sync/privacy/project-system tests passed; production synchronization was not run.
- Ignore rules and preparation diff checked. No full build: application rendering, routing and synchronization behavior were unchanged.
