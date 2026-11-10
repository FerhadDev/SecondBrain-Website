# Public note edits for owner review

No vault files were edited. The owner has now supplied six public Skill notes and three Achievement notes, plus both hubs and their relationships. The snapshot includes these real notes; no additional notes are required to populate the filters. The examples below are optional historical drafts, not outstanding publication requirements: do not copy them over existing notes or create duplicates. Use the templates for future additions, then run `npm.cmd run brain:sync`. No proficiency levels, extra dates, platforms or contributions are inferred.

## Existing source edits

1. In `D:\SecondBrain\Public\About-Me.md`, replace the existing LinkedIn line under Connect With Me with:

```markdown
- **LinkedIn:** [ferhadzamanov](https://www.linkedin.com/in/ferhadzamanov/)
```

The website safely normalizes the existing scheme-less LinkedIn profile already, so do not add a duplicate contact.

2. In `D:\SecondBrain\Public\Projects\Game-Jam\Are you king enough.md`, add `distribution: download` to the existing frontmatter. Keep all other fields, text and the itch.io URL. The website metadata supplement already provides this confirmed value; the source field overrides it if deliberately changed. Use `distribution: browser` only for a verified browser-playable game; omit unknown distribution (button says View on itch.io). Do not infer distribution merely from a platform field.

## Copy-ready new public notes

The templates in `website/Skill.template.md` and `website/Achievement.template.md` support future notes. Required fields are title/type/visibility; category and tags below make intent explicit. Real wikilinks create the relationships.

### D:\SecondBrain\Public\Skills\Unity.md

```markdown
---
title: "Unity"
type: skill
visibility: public
category: Skills
tags: [skill]
---

Unity is listed in my public developer profile. This note collects related knowledge.

## Related notes
[[Public/About-Me]]
[[Public/Projects/Game-Jam/Are you king enough]]
[[Public/Projects/Game-Jam/Tengri]]
```

### D:\SecondBrain\Public\Skills\CSharp.md

```markdown
---
title: "C#"
type: skill
visibility: public
category: Skills
tags: [skill]
---

C# is listed under Programming in my public profile.

## Related notes
[[Public/About-Me]]
[[Public/Skills/Gameplay-Programming]]
```

### D:\SecondBrain\Public\Skills\Gameplay-Programming.md

```markdown
---
title: "Gameplay Programming"
type: skill
visibility: public
category: Skills
tags: [skill]
---

Gameplay programming is a focus described in my public profile.

## Related notes
[[Public/About-Me]]
[[Public/Skills/Unity]]
[[Public/Skills/CSharp]]
[[Public/Projects/Game-Jam/Are you king enough]]
```

### D:\SecondBrain\Public\Skills\Game-Design.md

```markdown
---
title: "Game Design"
type: skill
visibility: public
category: Skills
tags: [skill]
---

Game design is listed in my public profile. These links organize knowledge, not project-credit claims.

## Related notes
[[Public/About-Me]]
[[Public/Skills/Gameplay-Programming]]
```

### D:\SecondBrain\Public\Skills\UI-Systems.md

```markdown
---
title: "UI Systems"
type: skill
visibility: public
category: Skills
tags: [skill]
---

A knowledge topic related to the UI and gameplay-flow interests in my public profile.

## Related notes
[[Public/About-Me]]
[[Public/Projects/Game-Jam/Are you king enough]]
```

### D:\SecondBrain\Public\Achievements\Turkic-Game-Jam-2025.md

```markdown
---
title: "Turkic Game Jam 2025 - 4th place"
type: achievement
visibility: public
category: Achievements
tags: [achievement]
---

The public Tengri note states that the team built Tengri during Turkic Game Jam 2025 over two days and placed 4th.

## Related notes
[[Public/About-Me]]
[[Public/Projects/Game-Jam/Tengri]]
```

### D:\SecondBrain\Public\Achievements\Green-Energy-Hackathon-2026.md

```markdown
---
title: "Green Energy Hackathon 2026 - 1st place"
type: achievement
visibility: public
category: Achievements
tags: [achievement]
---

My public About Me note records participation with Team HelioSight at Yessenov University in Kazakhstan in 2026 and a first-place team result.

## Related notes
[[Public/About-Me]]
```

## Reciprocal source links (after creating the notes)

Append this section to `D:\SecondBrain\Public\About-Me.md`:

```markdown
## Public knowledge and achievements
[[Public/Skills/Unity]]
[[Public/Skills/CSharp]]
[[Public/Skills/Gameplay-Programming]]
[[Public/Skills/Game-Design]]
[[Public/Skills/UI-Systems]]
[[Public/Achievements/Turkic-Game-Jam-2025]]
[[Public/Achievements/Green-Energy-Hackathon-2026]]
```

Under the existing Related Knowledge section of `D:\SecondBrain\Public\Projects\Game-Jam\Are you king enough.md`, append:

```markdown
[[Public/Skills/Unity]]
[[Public/Skills/Gameplay-Programming]]
[[Public/Skills/UI-Systems]]
```

Append to `D:\SecondBrain\Public\Projects\Game-Jam\Tengri.md`:

```markdown
## Related public knowledge
[[Public/Skills/Unity]]
[[Public/Skills/Gameplay-Programming]]
[[Public/Achievements/Turkic-Game-Jam-2025]]
```

## Evidence limits

The supplied suggestion says Turkish Game Jam; the approved Tengri source says **Turkic Game Jam 2025**, so the draft preserves that spelling. The Green Energy draft uses only the approved About Me account. Incubation/demo-day notes are deferred: the profile mentions general participation but does not identify a specific incubation or demo-day event/date/result. Supply verified public details before making a dedicated achievement note; do not publish placeholder claims.

Graph categories prioritize semantic public-note tags (derived from type/category at build time) and fall back to folder paths. Edges come exclusively from resolved public Markdown links. No skill/achievement nodes are synthesized from profile lists. Selecting a category shows only that category, so cross-category edges are visible with All categories. Existing search/zoom/pan/reset remain unchanged.
