import fs from "node:fs/promises"
import path from "node:path"
import { createHash } from "node:crypto"
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import { sync, noLinks } from "./sync-obsidian.mjs"
import { validatePublicContent } from "./validate-public-content.mjs"
import { validateDirectory } from "./project-schema.mjs"

export const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
export const managed = [
  "content/brain",
  "content/project-media/posters",
  "website/project-video-posters.json",
  ".obsidian-sync/report.json",
]

export async function run(command, args, { cwd = repo, signal } = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, signal, windowsHide: true, stdio: "inherit" })
    let failure
    child.on("error", (error) => {
      failure = error
    })
    // Abort emits error before the child has stopped; rollback must wait for close.
    child.on("close", (code) => {
      if (failure) reject(failure)
      else if (code === 0) resolve()
      else reject(Error(`${path.basename(command)} exited ${code}`))
    })
  })
}

export async function withLock(root, work) {
  const dir = path.join(root, ".obsidian-sync")
  await noLinks(dir)
  await fs.mkdir(dir, { recursive: true })
  const lockPath = path.join(dir, "pipeline.lock")
  let lock
  try {
    lock = await fs.open(lockPath, "wx")
  } catch (e) {
    if (e.code === "EEXIST")
      throw Object.assign(
        Error("Another brain sync/publish is running (pipeline.lock). Stop it first."),
        { code: "EBUSY" },
      )
    throw e
  }
  try {
    await lock.writeFile(String(process.pid))
    return await work()
  } finally {
    await lock.close()
    await fs.unlink(lockPath)
  }
}

async function exists(p) {
  try {
    await fs.lstat(p)
    return true
  } catch (e) {
    if (e.code === "ENOENT") return false
    throw e
  }
}

export async function fingerprints(root) {
  const result = new Map()
  async function visit(rel) {
    const full = path.join(root, rel)
    if (!(await exists(full))) return
    await noLinks(full)
    const stat = await fs.lstat(full)
    if (stat.isDirectory()) for (const name of await fs.readdir(full)) await visit(rel + "/" + name)
    else
      result.set(
        rel,
        createHash("sha256")
          .update(await fs.readFile(full))
          .digest("hex"),
      )
  }
  for (const rel of managed.filter((p) => !p.startsWith(".obsidian-sync"))) await visit(rel)
  return result
}

// Transactions own only sync-managed paths; the index and website source are never touched.
export async function pipeline({
  root = repo,
  source,
  metadata,
  signal,
  locked = false,
  force = false,
  build,
  checkOutput,
  log = console.log,
} = {}) {
  const work = async () => {
    signal?.throwIfAborted()
    const before = await fingerprints(root)
    const temp = await fs.mkdtemp(path.join(root, ".obsidian-sync/run-"))
    const present = new Set()
    for (const rel of managed) {
      await noLinks(path.join(root, rel))
      if (await exists(path.join(root, rel))) {
        present.add(rel)
        await fs.mkdir(path.dirname(path.join(temp, "backup", rel)), { recursive: true })
        await fs.cp(path.join(root, rel), path.join(temp, "backup", rel), { recursive: true })
      }
    }
    let promoted = false,
      safeToClean = false
    try {
      const report = await sync({
        source,
        destination: path.join(root, "content/brain"),
        reportPath: path.join(root, ".obsidian-sync/report.json"),
        projectMetadata: metadata,
      })
      await validatePublicContent(path.join(root, "content"))
      const invalid = (await validateDirectory(path.join(root, "content/brain"))).filter((p) =>
        p.issues.some((i) => !i.startsWith("duplicate title")),
      )
      // Missing wikilinks remain safely sanitized, as in the existing public-only sync.
      if (
        invalid.length ||
        report.issues.some((i) => !i.reason.startsWith("Unresolved wikilink removed")) ||
        report.excluded.some((i) => /Invalid|Unsafe/.test(i.reason))
      )
        throw Error(
          "Public validation failed: invalid metadata, missing media, or unsafe markup. Review the local sync report.",
        )
      const after = await fingerprints(root)
      const changed = [...new Set([...before.keys(), ...after.keys()])]
        .filter((p) => before.get(p) !== after.get(p))
        .sort()
      const validatedPath = path.join(root, ".obsidian-sync/validated-snapshot.json")
      let validated
      try {
        validated = JSON.parse(await fs.readFile(validatedPath, "utf8"))
      } catch (e) {
        if (e.code !== "ENOENT") throw e
      }
      const digest = JSON.stringify([...after].sort())
      if (
        !force &&
        !changed.length &&
        validated?.digest === digest &&
        (await exists(path.join(root, "public/index.html")))
      ) {
        log("Public snapshot unchanged; no build needed.")
        safeToClean = true
        return { changed, built: false, digest }
      }
      const output = path.join(temp, "public")
      if (build) await build(output)
      else
        await run(process.execPath, ["quartz/bootstrap-cli.mjs", "build", "-o", output], {
          cwd: root,
          signal,
        })
      if (checkOutput) await checkOutput(output)
      else {
        await run(process.execPath, ["scripts/validate-brain.mjs", output], { cwd: root, signal })
        await run(process.execPath, ["scripts/validate-portfolio.mjs", output], {
          cwd: root,
          signal,
        })
      }
      if (await exists(path.join(output, "CNAME")))
        throw Error("Unexpected CNAME in project Pages output")
      await validatePublicContent(path.join(root, "content"))
      if (JSON.stringify([...(await fingerprints(root))].sort()) !== digest)
        throw Error("Public snapshot changed during build; retry the update.")
      signal?.throwIfAborted()
      const live = path.join(root, "public"),
        old = path.join(temp, "previous-public")
      await noLinks(live)
      const hadLive = await exists(live)
      if (hadLive) await fs.rename(live, old)
      try {
        await fs.rename(output, live)
      } catch (e) {
        if (hadLive) await fs.rename(old, live)
        throw e
      }
      promoted = true
      await fs.writeFile(validatedPath, JSON.stringify({ digest }) + "\n")
      const projects = changed.filter((p) => /^content\/brain\/Projects\/.*\.md$/i.test(p))
      log(
        `Validated public update: ${changed.length} files; ${projects.length} project notes. ${report.issues.length} sanitized unavailable references.`,
      )
      changed.forEach((p) => log(`  ${p}`))
      safeToClean = true
      return { changed, projects, built: true, digest }
    } catch (e) {
      if (await exists(path.join(root, ".obsidian-sync/report.json")))
        await fs
          .copyFile(
            path.join(root, ".obsidian-sync/report.json"),
            path.join(root, ".obsidian-sync/failed-report.json"),
          )
          .catch(() => {}) // Diagnostics must never prevent restoring the valid snapshot.
      if (!promoted) {
        // Root and managed paths are fixed, verified workspace descendants.
        for (const rel of managed) {
          const target = path.resolve(root, rel)
          if (!target.startsWith(path.resolve(root) + path.sep)) throw Error("Rollback path escape")
          await noLinks(target)
          await fs.rm(target, { recursive: true, force: true })
          if (present.has(rel)) {
            await fs.mkdir(path.dirname(target), { recursive: true })
            await fs.cp(path.join(temp, "backup", rel), target, { recursive: true })
          }
        }
      }
      await fs.writeFile(path.join(root, ".obsidian-sync/last-error.txt"), String(e.message) + "\n")
      safeToClean = true
      throw e
    } finally {
      if (safeToClean) {
        const resolved = path.resolve(temp)
        if (!resolved.startsWith(path.resolve(root, ".obsidian-sync") + path.sep + "run-"))
          throw Error("Temporary path escape")
        await noLinks(resolved)
        await fs.rm(resolved, { recursive: true, force: true })
      }
    }
  }
  return locked ? work() : withLock(root, work)
}

export async function retryLocked(
  work,
  { attempts = 3, delay = (ms) => new Promise((r) => setTimeout(r, ms)) } = {},
) {
  for (let n = 0; ; n++) {
    try {
      return await work()
    } catch (e) {
      if (n + 1 >= attempts || !["EBUSY", "EACCES", "EPERM", "ENOENT"].includes(e.code)) throw e
      await delay(500 * (n + 1))
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await retryLocked(() => pipeline()).catch((e) => {
    console.error(e.message)
    process.exitCode = 1
  })
