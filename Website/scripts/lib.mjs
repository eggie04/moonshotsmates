import "dotenv/config"
import { connect } from "framer-api"

function requiredEnv(name) {
  const value = process.env[name]
  if (!value || !value.trim()) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value.trim()
}

export function getConfig() {
  return {
    projectUrl: requiredEnv("FRAMER_PROJECT_URL"),
    apiKey: requiredEnv("FRAMER_API_KEY"),
    codeDir: (process.env.FRAMER_CODE_DIR || "Framer/Code").trim(),
    remotePrefix: (process.env.FRAMER_REMOTE_PREFIX || "").trim(),
    publishAfterSync: String(process.env.FRAMER_PUBLISH || "0") === "1",
    allowOverwrite: String(process.env.FRAMER_ALLOW_OVERWRITE || "0") === "1",
  }
}

export async function withFramerClient(fn) {
  const { projectUrl, apiKey } = getConfig()
  const framer = await connect(projectUrl, apiKey)
  try {
    return await fn(framer)
  } finally {
    await framer.disconnect()
  }
}

export function toPosixPath(input) {
  return input.split("\\\\").join("/")
}
