# Public portfolio updates

Run commands from `D:\SecondBrain-Website`. On Windows PowerShell use `npm.cmd` if execution policy blocks `npm.ps1`.

## Watch or synchronize once

- `npm run brain:watch` watches only `D:\SecondBrain\Public`. Stop with **Ctrl+C**; it closes the watcher and aborts an active build safely. Nothing runs as a Windows service.
- `npm run brain:sync` performs one validated update.
- Existing `npm run dev:brain` uses the same watcher with the local preview at `http://localhost:8080/projects`.

New/edited/deleted Markdown and approved media are detected, including renames. Hidden, Private, Templates and symlinked subtrees are ignored. Stable-write detection plus debounce combines rapid edits; one update runs at a time, and unchanged snapshots skip rebuilding. Temporary lock errors retry three times. A shared lock prevents the watcher and publisher from modifying the snapshot simultaneously.

Sync reuses the existing public-only import, then validates public flags, metadata, media and generated local links. Invalid updates restore the previous managed snapshot; the preview is replaced only after a successful build and link checks. The Git index is untouched. Already-sanitized missing wikilinks remain warnings; new missing media or invalid project metadata block the update. Public notes remain the source of truth; do not edit `content/brain/` by hand. Website-owned layouts and pages are not synchronized away.

## Publish deliberately

Keep automation, configuration and website-owned page changes reviewed and committed separately through normal Git review. `brain:publish` refuses staged changes, uncommitted build/configuration code or website-owned pages, shallow history, a missing remote `v5`, or differing local/remote tips. This ensures local validation uses the same code as the hosted build. This command is for subsequent public-content updates, not initial repository setup or history reconciliation.

1. Stop the watcher with Ctrl+C.
2. Run `npm run brain:publish` on local `v5`.
3. It verifies both origin URLs, fetches remote `v5`, requires matching local/remote tips, synchronizes and rebuilds, and lists the exact proposed files.
4. Review the list. Type **PUBLISH** only to authorize that commit and push. Any other answer cancels without staging or committing. There is no `--yes` or unattended mode.

Only `content/brain/` approved Markdown/media, owned poster JPEGs and `website/project-video-posters.json` can be staged. Code, diagnostics, caches, secrets and unrelated staged work are excluded. Publishing binds its proposed files to the validated snapshot digest, rechecks the remote and fingerprint after confirmation, verifies staged paths and whitespace, commits only changes and pushes `HEAD:refs/heads/v5`. No merge, reset, force push or upstream change is performed. A rejected push leaves the commit local for manual review; it does not retry forcefully. No-op updates create no commit.

The Pages workflow runs on `v5` pushes and manual dispatch. It builds only the committed public snapshot, tests and checks links, uploads the validated artifact, and deploys only if the build job succeeds. Failed builds cannot reach the deploy job. It never accesses the vault or automatically enables Pages. GitHub Pages must separately be configured to use GitHub Actions; required repository/account permissions and the `github-pages` environment must allow `v5`. Other inherited publishing jobs remain disabled/upstream-only. This workflow has not been run remotely during implementation.

## Add a game

Add a public project note using the existing project template/metadata rules under Public Projects, with real approved screenshots/videos. Keep metadata valid and reference existing media. The watcher discovers the project automatically; no hardcoded registration is needed. A renamed/deleted note or media file is reflected after validation. Review rights and credits for each new asset before approving its push. Existing custom themes, graph, gallery, search and filters remain in place.

## Troubleshoot

- Invalid metadata/media/links: correct the **Public source**, then retry. `last-error.txt` and `failed-report.json` under `.obsidian-sync/` are local only. Missing approved knowledge notes are not reconstructed from elsewhere in the vault.
- Temporarily locked files: close the application holding them, then save again or run `brain:sync`.
- Another sync/publish running: stop it and retry. After a crash, remove `.obsidian-sync/pipeline.lock` **only after confirming no watcher/publisher is running**. Backups are cleaned after normal success/rollback; a crash may leave local `run-*` recovery directories.
- Existing staged changes/shallow clone/remote mismatch: complete the initial review or reconcile Git history separately. The publisher deliberately refuses to fix or overwrite it.
- Failed push: inspect the local commit and remote history before an explicit manual retry. Never force push.
- Any rollback/recovery filesystem error: stop and inspect the ignored recovery directory before retrying; do not edit the vault to repair a website copy.

## Fully automatic publishing later

It is **not enabled**. Enabling it later requires explicit approval and a separate reviewed change for credentials, per-project media approval, branch protection, scheduling and failure recovery. The current watcher never commits or pushes; the publisher always requires interactive confirmation.

## Checks

`node --test scripts/brain-workflow.test.mjs scripts/sync-obsidian.test.mjs scripts/projects-system.test.mjs scripts/validate-public-content.test.mjs`

`npm run build:pages` builds the repository snapshot without reading the vault. Publisher Git mutations and remote races are tested with injected Git responses; tests do not commit or push to GitHub.
