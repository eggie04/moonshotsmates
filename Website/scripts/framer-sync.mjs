import { readFile, readdir } from "node:fs/promises"
import path from "node:path"
import { getConfig, toPosixPath, withFramerClient } from "./lib.mjs"

const CODE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"])
const MAX_RETRIES = Number(process.env.FRAMER_SYNC_MAX_RETRIES || 4)
const RETRY_DELAY_MS = Number(process.env.FRAMER_SYNC_RETRY_DELAY_MS || 2500)
const SKIP_FILES = new Set(
  (process.env.FRAMER_SYNC_SKIP_FILES || "MoonshotsLatestVideos_data.ts")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
)

async function walkFiles(dir) {
  const items = await readdir(dir, { withFileTypes: true })
  const results = []

  for (const item of items) {
    if (item.name.startsWith(".")) continue

    const fullPath = path.join(dir, item.name)
    if (item.isDirectory()) {
      results.push(...(await walkFiles(fullPath)))
      continue
    }

    if (!item.isFile()) continue
    if (!CODE_EXTENSIONS.has(path.extname(item.name))) continue

    results.push(fullPath)
  }

  return results
}

function normalizeRemotePath(relPath, prefix) {
  const posixRel = toPosixPath(relPath)
  const cleanPrefix = prefix.replace(/^\/+|\/+$/g, "")
  return cleanPrefix ? `${cleanPrefix}/${posixRel}` : posixRel
}

function toFramerSafePath(inputPath) {
  const posix = toPosixPath(inputPath)
  const segments = posix.split("/")
  const transformed = segments.map((segment) => {
    const lastDot = segment.lastIndexOf(".")
    if (lastDot <= 0) {
      return segment.replace(/[^A-Za-z0-9_-]/g, "_")
    }
    const stem = segment.slice(0, lastDot).replace(/[^A-Za-z0-9_-]/g, "_")
    const ext = segment.slice(lastDot)
    return `${stem}${ext}`
  })
  return transformed.join("/")
}

function splitNameParts(filePath) {
  const base = path.basename(filePath)
  const ext = path.extname(base)
  const stem = ext ? base.slice(0, -ext.length) : base
  return { base, stem, ext }
}

function findStemConflict(remoteByName, targetPath) {
  const { stem, ext } = splitNameParts(targetPath)
  const matcher = new RegExp(`^${stem}(?:_\\d+)?${ext.replace(".", "\\.")}$`)
  for (const [name, file] of remoteByName.entries()) {
    if (matcher.test(path.basename(name))) {
      return file
    }
  }
  return null
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isTransientFramerError(error) {
  const message = error instanceof Error ? error.message : String(error)
  const lowered = message.toLowerCase()
  return (
    lowered.includes("waitforcomponentloader timeout") ||
    lowered.includes("connection timeout") ||
    lowered.includes("project_closed") ||
    lowered.includes("connection closed") ||
    lowered.includes("timeout")
  )
}

async function withRetry(framer, label, fn) {
  let attempt = 0
  while (true) {
    try {
      return await fn()
    } catch (error) {
      attempt += 1
      const transient = isTransientFramerError(error)
      if (!transient || attempt >= MAX_RETRIES) {
        throw error
      }
      const waitMs = RETRY_DELAY_MS * attempt
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`Retry ${attempt}/${MAX_RETRIES - 1} for ${label}: ${message}`)
      if (typeof framer.reconnect === "function") {
        try {
          await framer.reconnect()
        } catch {
          // Best effort; delay and retry operation regardless.
        }
      }
      await sleep(waitMs)
    }
  }
}

const config = getConfig()
const localRoot = path.resolve(process.cwd(), config.codeDir)
const localFiles = await walkFiles(localRoot)

if (localFiles.length === 0) {
  console.log(`No code files found in ${localRoot}`)
  process.exit(0)
}

await withFramerClient(async (framer) => {
  const remoteFiles = await framer.getCodeFiles()
  const remoteByPath = new Map(remoteFiles.map((file) => [toPosixPath(file.path), file]))
  const remoteBySafePath = new Map(remoteFiles.map((file) => [toFramerSafePath(file.path), file]))
  const remoteByName = new Map(remoteFiles.map((file) => [toPosixPath(file.name), file]))

  let created = 0
  let updated = 0
  let skipped = 0

  for (const absPath of localFiles) {
    const relPath = toPosixPath(path.relative(localRoot, absPath))
    const remotePath = normalizeRemotePath(relPath, config.remotePrefix)
    const remoteName = toPosixPath(path.basename(remotePath))
    if (SKIP_FILES.has(remoteName)) {
      skipped += 1
      console.log(`Skip (configured): ${remotePath}`)
      continue
    }
    const code = await readFile(absPath, "utf8")

    const remoteSafePath = toFramerSafePath(remotePath)
    const existing =
      remoteByPath.get(remotePath) || remoteBySafePath.get(remoteSafePath) || remoteByName.get(remoteName)

    if (!existing) {
      try {
        const createdFile = await withRetry(framer, `create ${remotePath}`, () => framer.createCodeFile(remotePath, code))
        remoteByPath.set(toPosixPath(createdFile.path), createdFile)
        remoteBySafePath.set(toFramerSafePath(createdFile.path), createdFile)
        remoteByName.set(toPosixPath(createdFile.name), createdFile)
        created += 1
        console.log(`Created: ${createdFile.path}`)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (message.includes("module with same type/name already exists")) {
          const conflictFile = findStemConflict(remoteByName, remotePath)
          if (conflictFile) {
            if (!config.allowOverwrite) {
              skipped += 1
              console.log(`Skip (overwrite disabled): ${conflictFile.path}`)
              continue
            }
            await withRetry(framer, `update ${conflictFile.path}`, () => conflictFile.setFileContent(code))
            updated += 1
            console.log(`Updated (conflict match): ${conflictFile.path}`)
            continue
          }
          skipped += 1
          console.log(`Skip (name conflict): ${remotePath}`)
          continue
        }
        throw error
      }
      continue
    }

    if (existing.content === code) {
      skipped += 1
      console.log(`Unchanged: ${remotePath}`)
      continue
    }

    if (!config.allowOverwrite) {
      skipped += 1
      console.log(`Skip (overwrite disabled): ${remotePath}`)
      continue
    }

    await withRetry(framer, `update ${remotePath}`, () => existing.setFileContent(code))
    updated += 1
    console.log(`Updated: ${remotePath}`)
  }

  console.log(`Summary: created=${created} updated=${updated} skipped=${skipped}`)

  if (config.publishAfterSync) {
    const publishResult = await withRetry(framer, "publish", () => framer.publish())
    await withRetry(framer, `deploy ${publishResult.deployment.id}`, () => framer.deploy(publishResult.deployment.id))
    console.log(`Published deployment: ${publishResult.deployment.id}`)
  }
})
