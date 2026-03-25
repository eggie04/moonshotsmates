import { withFramerClient } from "./lib.mjs"

await withFramerClient(async (framer) => {
  const publishResult = await framer.publish()
  await framer.deploy(publishResult.deployment.id)

  console.log(`Published deployment: ${publishResult.deployment.id}`)
  for (const host of publishResult.hostnames) {
    console.log(`Preview hostname: ${host.hostname}`)
  }
})
