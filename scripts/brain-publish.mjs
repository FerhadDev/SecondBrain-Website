import fs from "node:fs/promises"
import path from "node:path"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { createInterface } from "node:readline/promises"
import { fileURLToPath } from "node:url"
import { repo, withLock, pipeline, fingerprints } from "./brain-pipeline.mjs"
import { assets, forbidden, noLinks } from "./sync-obsidian.mjs"

const exec = promisify(execFile)
export async function git(args) {
  try {
    return (await exec("git", args, { cwd: repo, windowsHide: true, maxBuffer: 16 * 1024 * 1024 }))
      .stdout
  } catch {
    throw Error(`Git ${args[0]} failed. No force/merge attempted; inspect the repository manually.`)
  }
}
const paths = [
  "content/brain",
  "content/project-media/posters",
  "website/project-video-posters.json",
]
export function publishable(p) {
  if (p.includes("\\") || forbidden(p) || p.split("/").includes("..")) return false
  if (p === "website/project-video-posters.json") return true
  if (/^content\/project-media\/posters\/[a-f0-9]{20}\.jpg$/.test(p)) return true
  return (
    p.startsWith("content/brain/") &&
    (p.endsWith(".md") || assets.has(path.posix.extname(p).toLowerCase()))
  )
}

export async function checkBranch(call) {
  if ((await call(["branch", "--show-current"])).trim() !== "v5")
    throw Error("Publishing requires branch v5.")
  for (const args of [
    ["remote", "get-url", "--all", "origin"],
    ["remote", "get-url", "--push", "--all", "origin"],
  ]) {
    const urls = (await call(args)).trim().split(/\r?\n/)
    if (
      !urls.length ||
      urls.some(
        (url) =>
          !/^(?:https:\/\/github\.com\/|git@github\.com:)FerhadDev\/SecondBrain-Website(?:\.git)?$/i.test(
            url,
          ),
      )
    )
      throw Error("Origin fetch/push URL is not the approved repository.")
  }
  if ((await call(["diff", "--cached", "--name-only", "-z"])).trim())
    throw Error("Existing staged changes: finish/review them separately before brain:publish.")
  if ((await call(["rev-parse", "--is-shallow-repository"])).trim() !== "false")
    throw Error("Shallow clone: obtain and review full ancestry separately before publishing.")
  const inputs = [
    "package.json",
    "package-lock.json",
    "quartz.config.yaml",
    "quartz.config.default.yaml",
    "quartz.ts",
    "tsconfig.json",
    "quartz",
    "website",
    "scripts",
    ".github/workflows",
    "content",
    ":(exclude)content/brain",
    ":(exclude)content/project-media/posters",
    ":(exclude)website/project-video-posters.json",
  ]
  const modified = await call(["diff", "--name-only", "-z", "--", ...inputs])
  const newFiles = await call(["ls-files", "--others", "--exclude-standard", "-z", "--", ...inputs])
  if (modified || newFiles)
    throw Error(
      "Uncommitted build/configuration code: review and commit it separately so local validation matches the hosted build.",
    )
}

export async function checkRemote(call) {
  if (!(await call(["ls-remote", "--heads", "origin", "refs/heads/v5"])).trim())
    throw Error("Remote v5 does not exist. Bootstrap the first commit/branch separately.")
  await call(["fetch", "--no-tags", "origin", "refs/heads/v5"])
  const remote = (await call(["rev-parse", "FETCH_HEAD"])).trim()
  if (remote !== (await call(["rev-parse", "HEAD"])).trim())
    throw Error(
      "Local/remote v5 differ. Review incoming or unpublished commits separately; no merge or overwrite attempted.",
    )
  return remote
}

export async function publish({
  root = repo,
  call = git,
  synchronize = () => pipeline({ root, locked: true, force: true }),
  confirm,
  log = console.log,
} = {}) {
  return withLock(root, async () => {
    await checkBranch(call)
    const remote = await checkRemote(call)
    const validation = await synchronize()
    const dirty = await call(["diff", "--name-only", "--no-renames", "-z", "--", ...paths])
    const untracked = await call([
      "ls-files",
      "--others",
      "--exclude-standard",
      "-z",
      "--",
      ...paths,
    ])
    const changed = [...new Set((dirty + untracked).split("\0").filter(Boolean))].sort()
    if (!changed.length) {
      log("No public changes; no commit or push.")
      return { pushed: false }
    }
    if (changed.some((p) => !publishable(p))) throw Error("Non-allowlisted publish path rejected.")
    for (const p of changed) {
      const full = path.join(root, p)
      await noLinks(full)
      let bytes
      try {
        bytes = await fs.readFile(full)
      } catch (e) {
        if (e.code === "ENOENT") continue
        throw e
      }
      if (bytes.length >= 100 * 1024 * 1024) throw Error(`GitHub file size limit: ${p}`)
      if (
        !bytes.includes(0) &&
        /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9_-]{20,})|(?:api[_-]?key|client[_-]?secret|access[_-]?token|password)\s*[:=]\s*["'][^"'\r\n]{8,}["']/i.test(
          bytes.toString(),
        )
      )
        throw Error(`Credential pattern rejected: ${p}`)
    }
    const digest = JSON.stringify([...(await fingerprints(root))].sort())
    if (validation?.digest && validation.digest !== digest)
      throw Error("Public files changed after validation; validate again before publishing.")
    log(
      `Proposed public commit (${changed.length} files):\n${changed.map((p) => "  " + p).join("\n")}`,
    )
    if (!confirm || !(await confirm())) {
      log("Cancelled; no staging, commit or push.")
      return { pushed: false }
    }
    await checkBranch(call)
    if ((await checkRemote(call)) !== remote)
      throw Error("Remote moved during confirmation; review again.")
    if (JSON.stringify([...(await fingerprints(root))].sort()) !== digest)
      throw Error("Public files changed during confirmation; validate again.")
    const spec = path.join(root, ".obsidian-sync/publish-paths")
    await fs.writeFile(spec, changed.join("\0") + "\0")
    await call(["add", `--pathspec-from-file=${spec}`, "--pathspec-file-nul"])
    const staged = (await call(["diff", "--cached", "--name-only", "-z"]))
      .split("\0")
      .filter(Boolean)
      .sort()
    if (JSON.stringify(staged) !== JSON.stringify(changed))
      throw Error("Unexpected staged paths; inspect index manually.")
    if (JSON.stringify([...(await fingerprints(root))].sort()) !== digest)
      throw Error("Public files changed while staging; inspect index before retrying.")
    await call(["diff", "--cached", "--check"])
    await call(["commit", "-m", "content: sync approved public portfolio"])
    try {
      await call(["push", "origin", "HEAD:refs/heads/v5"])
    } catch {
      throw Error(
        "Push failed; the public commit remains local. Review remote changes and retry manually; no force push was attempted.",
      )
    }
    log("Approved public snapshot pushed to v5; Pages validates before deploying.")
    return { pushed: true }
  })
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const confirm = async () => {
    if (!process.stdin.isTTY || !process.stdout.isTTY)
      throw Error("Interactive confirmation required; unattended publishing is disabled.")
    const prompt = createInterface({ input: process.stdin, output: process.stdout })
    try {
      return (
        (await prompt.question("Type PUBLISH to commit these files and push v5: ")) === "PUBLISH"
      )
    } finally {
      prompt.close()
    }
  }
  await publish({ confirm }).catch((e) => {
    console.error(e.message)
    process.exitCode = 1
  })
}
