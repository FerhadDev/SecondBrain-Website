import type { Root, Element } from "hast"
import type { VFile } from "vfile"
import type { QuartzTransformerPlugin } from "../quartz/plugins/types"
import { nodeText } from "./project-themes/content"

// Verified public 404; no official replacement was found. Never rewrite the vault/snapshot.
export const unavailableRepository = "https://github.com/Estefan009/GameJamPlus"
export const unavailableLabel = "Repository unavailable (HTTP 404)"
const unavailableText =
  /(?<![\w./-])(?:https:\/\/)?github\.com\/Estefan009\/GameJamPlus(?![\w./-])/gi

export function preparePublicPresentation(tree: Root, file: VFile) {
  if (file.data.frontmatter?.visibility !== "public") return
  // ContentIndex carries tags, not arbitrary frontmatter: preserve semantic categories there.
  const fm = file.data.frontmatter
  const kind = String(fm.type).toLowerCase(),
    category = String(fm.category).toLowerCase()
  const tag = ["skill", "achievement", "project"].includes(kind)
    ? kind
    : category === "skills"
      ? "skill"
      : category === "achievements"
        ? "achievement"
        : ""
  if (tag) fm.tags = [...new Set([...(Array.isArray(fm.tags) ? fm.tags : []), tag])]
  const first = tree.children.findIndex((n) => n.type !== "text" || n.value.trim())
  const heading = tree.children[first]
  if (
    heading?.type === "element" &&
    heading.tagName === "h1" &&
    nodeText(heading).trim().toLowerCase() ===
      String(file.data.frontmatter.title).trim().toLowerCase()
  ) {
    // The portfolio supplies the title; retain its existing anchor on that rendered title.
    file.data.portfolioTitleId = heading.properties.id
    tree.children.splice(first, 1)
  }
  const walk = (node: Root | Element) => {
    for (const child of node.children) {
      if (child.type !== "element") continue
      if (child.tagName === "a" && child.properties.href === unavailableRepository) {
        child.tagName = "span"
        child.properties = { className: ["unavailable-reference"] }
        child.children = [{ type: "text", value: unavailableLabel }]
      } else walk(child)
    }
  }
  walk(tree)
  for (const key of ["text", "description"] as const)
    if (typeof file.data[key] === "string")
      // Quartz omits URL schemes in search text; don't change similarly named repositories.
      file.data[key] = file.data[key].replace(unavailableText, unavailableLabel)
}

export const PublicPresentation: QuartzTransformerPlugin = () => ({
  name: "PublicPresentation",
  htmlPlugins: () => [() => (tree, file) => preparePublicPresentation(tree, file)],
})
