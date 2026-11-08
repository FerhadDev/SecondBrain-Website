import type { Root, RootContent } from "hast"
import type { QuartzPluginData } from "../../quartz/plugins/vfile"

export const nodeText = (node: Root | RootContent): string =>
  node.type === "text" ? node.value : "children" in node ? node.children.map(nodeText).join("") : ""

// Read the already sanitized public HTML tree, rather than loading or reparsing vault files.
export function documentedSection(file: QuartzPluginData, heading: RegExp) {
  const nodes = file.htmlAst?.children ?? []
  const start = nodes.findIndex(
    (node) =>
      node.type === "element" && /^h[23]$/.test(node.tagName) && heading.test(nodeText(node)),
  )
  const paragraphs: string[] = [],
    items: string[] = []
  if (start >= 0)
    for (const node of nodes.slice(start + 1)) {
      if (node.type !== "element") continue
      if (/^h[123]$/.test(node.tagName)) break
      if (node.tagName === "p") paragraphs.push(nodeText(node))
      if (node.tagName === "ul" || node.tagName === "ol")
        for (const child of node.children)
          if (child.type === "element" && child.tagName === "li") items.push(nodeText(child))
    }
  return { paragraphs, items }
}
export function labeledValue(items: string[], label: string) {
  const match = items.find((item) => item.toLowerCase().startsWith(label.toLowerCase() + ":"))
  return match?.slice(label.length + 1).trim() ?? ""
}
