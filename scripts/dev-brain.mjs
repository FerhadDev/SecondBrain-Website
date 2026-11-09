import { startWatcher } from "./brain-watch.mjs"

// Preserve the existing preview command using the shared validated pipeline.
await startWatcher({ preview: true })
