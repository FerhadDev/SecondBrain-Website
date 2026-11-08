import { validateDirectory } from "./project-schema.mjs"
const report = await validateDirectory("content/brain")
for (const { file, issues } of report) for (const issue of issues) console.log(`${file}: ${issue}`)
console.log(
  `Validated ${report.length} project notes. Optional and legacy metadata warnings do not block preview.`,
)
if (process.argv.includes("--strict") && report.some((r) => r.issues.length)) process.exitCode = 1
