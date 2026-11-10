import type { QuartzPluginData } from "../quartz/plugins/vfile"
import type { RootContent } from "hast"
import { nodeText } from "./project-themes/content"

export const itchActionLabel = (distribution?: string) =>
  distribution === "download"
    ? "Download on itch.io"
    : distribution === "browser"
      ? "Play on itch.io"
      : "View on itch.io"

export function profileLinks(file?: QuartzPluginData) {
  if (file?.frontmatter?.visibility !== "public") return []
  const nodes = file?.htmlAst?.children ?? []
  const start = nodes.findIndex(
    (n) =>
      n.type === "element" && /^h[23]$/.test(n.tagName) && /Connect With Me/i.test(nodeText(n)),
  )
  const found = new Map<string, string>()
  const visit = (n: RootContent) => {
    if (n.type === "element" && n.tagName === "a" && typeof n.properties.href === "string") {
      try {
        const url = new URL(n.properties.href)
        if (url.protocol !== "https:" || url.username || url.password) return
        const host = url.hostname.toLowerCase()
        const label =
          host === "github.com"
            ? "GitHub"
            : /^(?:[\w-]+\.)?itch\.io$/.test(host)
              ? "itch.io"
              : ["linkedin.com", "www.linkedin.com"].includes(host) &&
                  /^\/in\/[\w-]+\/?$/.test(url.pathname)
                ? "LinkedIn"
                : ""
        if (label && !found.has(label)) found.set(label, url.href)
      } catch {}
    }
    if ("children" in n) n.children.forEach(visit)
  }
  if (start >= 0)
    for (const n of nodes.slice(start + 1)) {
      if (n.type === "element" && /^h[12]$/.test(n.tagName)) break
      visit(n)
    }
  return [...found].map(([label, href]) => ({ label, href }))
}
