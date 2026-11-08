import fs from "node:fs/promises"
import path from "node:path"
import { createHash } from "node:crypto"
import { withLocalBrowser } from "./lib/local-browser.mjs"
const root = path.resolve("content"),
  directory = path.join(root, "project-media/posters"),
  manifestPath = "website/project-video-posters.json"
const readJson = async (p) => JSON.parse((await fs.readFile(p, "utf8")).replace(/^\uFEFF/, ""))
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
await noLinks(root)
await noLinks(directory)
const previous = await readJson(manifestPath),
  config = await readJson("website/project-media.json"),
  report = await readJson(".obsidian-sync/report.json")
const records = Object.values(config).flatMap((project) => project.videos ?? []),
  next = {},
  pending = []
async function checked(raw) {
  if (
    typeof raw !== "string" ||
    !raw.startsWith("brain/") ||
    raw.split(/[\\/]/).some((p) => p.startsWith(".") || /^(private|templates)$/i.test(p))
  )
    throw Error("Unapproved media input")
  const full = path.resolve(root, raw)
  if (!full.startsWith(root + path.sep)) throw Error("Media escape")
  for (let current = full; current !== root; current = path.dirname(current))
    if ((await fs.lstat(current)).isSymbolicLink()) throw Error("Media symbolic link")
  return full
}
for (const rel of report.synchronized.filter((rel) => /\.(mp4|webm)$/i.test(rel))) {
  const raw = "brain/" + rel,
    full = await checked(raw),
    bytes = await fs.readFile(full),
    hash = createHash("sha256").update(bytes).digest("hex")
  const variants = [
    { key: raw, posterTime: records.find((v) => v.src === raw)?.poster_time ?? 1 },
    ...records
      .filter((v) => v.src === raw && typeof v.start === "number")
      .map((v) => ({
        key: raw + "#t=" + v.start + (v.end ? "," + v.end : ""),
        posterTime: v.poster_time ?? v.start,
      })),
  ]
  for (const variant of variants) {
    if (
      previous[variant.key]?.sourceHash === hash &&
      previous[variant.key]?.posterTime === variant.posterTime
    ) {
      try {
        if (!/^project-media\/posters\/[a-f0-9]{20}\.jpg$/.test(previous[variant.key].poster))
          throw Error("Invalid poster cache path")
        await noLinks(path.join(root, previous[variant.key].poster))
        await fs.access(path.join(root, previous[variant.key].poster))
        next[variant.key] = previous[variant.key]
        continue
      } catch {}
    }
    pending.push({
      raw,
      key: variant.key,
      full,
      hash,
      bytes: bytes.length,
      posterTime: variant.posterTime,
    })
  }
}
await fs.mkdir(directory, { recursive: true })
if (pending.length)
  await withLocalBrowser(root, async ({ origin, send, evaluate, until }) => {
    await send("Page.navigate", { url: origin + "/" })
    await until("document.body && document.readyState==='complete'")
    for (const item of pending) {
      const value = await evaluate(
        `(async()=>{const video=document.createElement('video');video.muted=true;video.preload='metadata';video.src=${JSON.stringify("/" + item.raw.split("/").map(encodeURIComponent).join("/"))};document.body.append(video);await new Promise((resolve,reject)=>{video.onloadedmetadata=resolve;video.onerror=()=>reject(Error('Cannot decode approved video'))});const width=video.videoWidth,height=video.videoHeight,duration=video.duration;await new Promise((resolve,reject)=>{video.onseeked=resolve;video.onerror=reject;video.currentTime=Math.min(${Number(item.posterTime)},Math.max(.01,duration-.05))});const canvas=document.createElement('canvas');canvas.width=Math.min(960,width);canvas.height=Math.round(canvas.width*height/width);canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);const image=canvas.toDataURL('image/jpeg',.88);video.pause();video.removeAttribute('src');video.load();video.remove();return{width,height,duration,image}})()`,
      )
      const name =
          createHash("sha256")
            .update(item.key + item.hash)
            .digest("hex")
            .slice(0, 20) + ".jpg",
        poster = "project-media/posters/" + name
      await fs.writeFile(
        path.join(directory, name),
        Buffer.from(value.image.split(",")[1], "base64"),
      )
      next[item.key] = {
        poster,
        posterTime: item.posterTime,
        width: value.width,
        height: value.height,
        duration: value.duration,
        bytes: item.bytes,
        sourceHash: item.hash,
      }
      console.log(
        `Prepared ${value.width}x${value.height} video poster (${value.duration.toFixed(2)} seconds).`,
      )
    }
  })
// Prune only the exact neutral poster files owned by the previous manifest.
for (const entry of Object.values(previous))
  if (
    !Object.values(next).some((v) => v.poster === entry.poster) &&
    /^project-media\/posters\/[a-f0-9]{20}\.jpg$/.test(entry.poster)
  ) {
    const target = path.resolve(root, entry.poster)
    if (!target.startsWith(directory + path.sep)) throw Error("Poster escape")
    try {
      await fs.unlink(target)
    } catch (e) {
      if (e.code !== "ENOENT") throw e
    }
  }
await fs.writeFile(
  manifestPath,
  JSON.stringify(
    Object.fromEntries(Object.entries(next).sort(([a], [b]) => a.localeCompare(b))),
    null,
    2,
  ) + "\n",
)
console.log(`Poster manifest contains ${Object.keys(next).length} recording / excerpt entries.`)
