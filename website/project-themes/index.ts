import type { ComponentType } from "preact"
import type { ProjectThemeProps } from "./media"
import { BlueDiary } from "./BlueDiary"
import { KingsCourt } from "./KingsCourt"
import { Tengri } from "./Tengri"

// A presentation registry only: it cannot create pages or override sync/publication rules.
const themes: Record<string, { className: string; Component: ComponentType<ProjectThemeProps> }> = {
  "brain/projects/game-jam/tengri": { className: "tengri-shell", Component: Tengri },
  "brain/projects/game-jam/are-you-king-enough": {
    className: "kings-court-shell",
    Component: KingsCourt,
  },
  "brain/projects/team/blue-diary": { className: "blue-diary-shell", Component: BlueDiary },
}
export function projectTheme(file: ProjectThemeProps["fileData"]) {
  const fm = file.frontmatter as Record<string, unknown> | undefined
  if (
    !fm ||
    fm.visibility !== "public" ||
    fm.draft === true ||
    fm.publish === false ||
    fm.published === false ||
    fm.unlisted === true ||
    fm.encrypted === true ||
    fm.password ||
    ["draft", "unpublished"].includes(String(fm.status))
  )
    return undefined
  const ids: Record<string, string> = {
    tengri: "brain/projects/game-jam/tengri",
    "blue-diary": "brain/projects/team/blue-diary",
    "are-you-king-enough": "brain/projects/game-jam/are-you-king-enough",
  }
  const id = typeof fm.project_id === "string" ? fm.project_id : ""
  const theme = Object.hasOwn(ids, id) ? themes[ids[id]] : undefined
  return theme ?? (Object.hasOwn(themes, String(file.slug)) ? themes[String(file.slug)] : undefined)
}
