import { getConfig, withFramerClient } from "./lib.mjs"

const config = getConfig()

await withFramerClient(async (framer) => {
  const info = await framer.getProjectInfo()
  const changed = await framer.getChangedPaths()

  console.log(`Connected to: ${info.name}`)
  console.log(`Project URL: ${config.projectUrl}`)
  console.log(
    `Unpublished changes: +${changed.added.length} ~${changed.modified.length} -${changed.removed.length}`
  )
})
