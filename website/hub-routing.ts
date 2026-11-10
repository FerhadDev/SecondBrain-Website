import type { Root } from "hast"
import { visit } from "unist-util-visit"
import type { PageTypePluginEntry, QuartzPageTypePluginInstance } from "../quartz/plugins/types"
import type { ProcessedContent } from "../quartz/plugins/vfile"
import { pathToRoot, type FullSlug } from "../quartz/util/path"

// A public Foo.md and Foo/ share a clean URL. Keep the authored introduction
// on the folder page, followed by Quartz's existing child-note listing.
export function installPublicHubRouting(entries: PageTypePluginEntry[]) {
  const folder = entries.find((entry) => entry.name === "FolderPage") as
    | QuartzPageTypePluginInstance
    | undefined
  if (!folder?.generate) return
  const generate = folder.generate, body = folder.body
  let hubs = new Map<string, ProcessedContent>()
  folder.generate = (args) => {
    hubs = new Map(args.content.filter(([, file]) => {
      const fm = file.data.frontmatter
      return fm?.visibility === "public" && fm.type !== "project" &&
        !file.data.unlisted && fm.publish !== false && !fm.encrypted
    }).map((entry) => [String(entry[1].data.slug), entry]))
    return generate(args).map((page) => {
      const slug = page.slug.replace(/\/index$/, "")
      const source = hubs.get(slug)
      if (page.slug !== slug && source) {
        page.data.publicHubSlug = slug
        page.data.portfolioTitleId = source[1].data.portfolioTitleId
      }
      return page
    })
  }
  folder.body = (...args) => {
    const original = body(...args)
    return Object.assign((props: Parameters<typeof original>[0]) => {
      const source = hubs.get(String(props.fileData.publicHubSlug))
      if (!source) return original(props)
      const tree = rebaseHubTree(source[0], String(source[1].data.slug), String(props.fileData.slug))
      return original({ ...props, tree })
    }, original)
  }
}

export function rebaseHubTree(source: Root, from: string, to: string): Root {
  const tree = structuredClone(source)
  visit(tree, "element", (node) => {
    for (const key of ["href", "src", "poster"]) {
      const value = node.properties[key]
      if (typeof value !== "string" || /^(?:[a-z][\w+.-]*:|\/|#|\?)/i.test(value)) continue
      const url = new URL(value, `https://public-hub.invalid/${from}.html`)
      node.properties[key] = `${pathToRoot(to as FullSlug)}/${url.pathname.slice(1)}${url.search}${url.hash}`
    }
  })
  return tree
}
