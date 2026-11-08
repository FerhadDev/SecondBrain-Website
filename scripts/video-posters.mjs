import fs from "node:fs/promises"
import path from "node:path"
import { createHash } from "node:crypto"
async function noLinks(target) {
  for (let current = path.resolve(target); ; current = path.dirname(current)) {
    try {
      if ((await fs.lstat(current)).isSymbolicLink()) throw Error("Poster symbolic link rejected")
    } catch (e) {
      if (e.code !== "ENOENT") throw e
    }
    if (path.dirname(current) === current) break
  }
}
// Derived images must disappear when their approved source is removed or changes.
export async function reconcileVideoPosters({ contentRoot, manifestPath, available }) {
  await noLinks(contentRoot)
  await noLinks(manifestPath)
  let previous
  try {
    previous = JSON.parse((await fs.readFile(manifestPath, "utf8")).replace(/^\uFEFF/, ""))
  } catch (e) {
    if (e.code === "ENOENT") return
    throw e
  }
  const retained = {}
  let changed = false
  for (const [raw, entry] of Object.entries(previous)) {
    if (!entry || !/^project-media\/posters\/[a-f0-9]{20}\.jpg$/.test(entry.poster))
      throw Error("Invalid generated poster ownership path")
    const source = raw.split("#")[0]
    if (
      !source.startsWith("brain/") ||
      source.split(/[\\/]/).some((p) => p.startsWith(".") || /^(private|templates)$/i.test(p))
    )
      throw Error("Invalid generated poster source")
    const buffer = available.get(source.slice(6)),
      hash = buffer ? createHash("sha256").update(buffer).digest("hex") : ""
    if (buffer && hash === entry.sourceHash) {
      retained[raw] = entry
      continue
    }
    const directory = path.resolve(contentRoot, "project-media/posters"),
      target = path.resolve(contentRoot, entry.poster)
    if (!target.startsWith(directory + path.sep)) throw Error("Generated poster escape rejected")
    await noLinks(target)
    try {
      await fs.unlink(target)
    } catch (e) {
      if (e.code !== "ENOENT") throw e
    }
    changed = true
  }
  if (changed) {
    await noLinks(manifestPath)
    await fs.writeFile(manifestPath, JSON.stringify(retained, null, 2) + "\n")
  }
}
