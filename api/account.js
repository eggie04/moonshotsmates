const crypto = require("node:crypto")
const {
  ACCOUNT_INDEX_KEY,
  LEADERBOARD_CACHE_KEY,
  defaultState,
  sanitizeGameState,
  sanitizeAccountIndex,
  sanitizeLeaderboardCache,
  getJson,
  setJson,
  normalizeAccountName,
  accountKey,
} = require("./_moonshotStore")

function hashPin(pin) {
  return crypto.createHash("sha256").update(String(pin || "")).digest("hex")
}

function readBody(req) {
  return req.body && typeof req.body === "object" ? req.body : {}
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const body = readBody(req)
  const action = String(body.action || "load")
  const rawName = String(body.name || "")
  const normalizedName = normalizeAccountName(rawName)
  const pin = String(body.pin || "").trim()

  if (!normalizedName) return res.status(400).json({ error: "Enter a valid profile name" })
  if (!pin || pin.length < 4 || pin.length > 32) {
    return res.status(400).json({ error: "PIN must be 4-32 characters" })
  }

  const key = accountKey(normalizedName)
  const existing = await getJson(key, null)
  const pinHash = hashPin(pin)
  const displayName = rawName.trim().slice(0, 24) || normalizedName

  async function upsertAccountIndex() {
    const currentIndex = sanitizeAccountIndex(await getJson(ACCOUNT_INDEX_KEY, []))
    const withoutCurrent = currentIndex.filter((entry) => entry.normalizedName !== normalizedName)
    const nextIndex = [...withoutCurrent, { normalizedName, displayName }]
      .sort((a, b) => a.displayName.localeCompare(b.displayName))
      .slice(0, 5000)
    await setJson(ACCOUNT_INDEX_KEY, nextIndex)
  }

  async function upsertLeaderboardCache(gameState) {
    const current = sanitizeLeaderboardCache(await getJson(LEADERBOARD_CACHE_KEY, {}))
    current[normalizedName] = {
      name: displayName,
      score: Math.max(0, Math.floor(Number(gameState?.ideas) || 0)),
      ideasPerSecond: Math.max(0, Math.floor(Number(gameState?.ideasPerSecond) || 0)),
      updatedAt: new Date().toISOString(),
    }
    await setJson(LEADERBOARD_CACHE_KEY, current)
  }

  if (!existing) {
    if (action === "save") {
      return res.status(404).json({ error: "Profile not found. Sign in first to create it." })
    }

    const created = {
      normalizedName,
      displayName,
      pinHash,
      game: defaultState(),
      updatedAt: new Date().toISOString(),
    }
    await setJson(key, created)
    await upsertAccountIndex()
    await upsertLeaderboardCache(created.game)
    return res.status(200).json({ ok: true, profileName: created.displayName, game: created.game, created: true })
  }

  if (existing.pinHash !== pinHash) {
    return res.status(401).json({ error: "Incorrect PIN for this profile" })
  }

  if (action === "save") {
    const updated = {
      ...existing,
      displayName,
      game: sanitizeGameState(body.game),
      updatedAt: new Date().toISOString(),
    }
    await setJson(key, updated)
    await upsertAccountIndex()
    await upsertLeaderboardCache(updated.game)
    return res.status(200).json({ ok: true })
  }

  await upsertAccountIndex()
  await upsertLeaderboardCache(existing.game)
  return res.status(200).json({
    ok: true,
    profileName: existing.displayName || normalizedName,
    game: sanitizeGameState(existing.game),
    created: false,
  })
}
