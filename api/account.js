const crypto = require("node:crypto")
const { defaultState, sanitizeGameState, getJson, setJson, normalizeAccountName, accountKey } = require("./_moonshotStore")

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

  if (!existing) {
    if (action === "save") {
      return res.status(404).json({ error: "Profile not found. Sign in first to create it." })
    }

    const created = {
      normalizedName,
      displayName: rawName.trim().slice(0, 24) || normalizedName,
      pinHash,
      game: defaultState(),
      updatedAt: new Date().toISOString(),
    }
    await setJson(key, created)
    return res.status(200).json({ ok: true, profileName: created.displayName, game: created.game, created: true })
  }

  if (existing.pinHash !== pinHash) {
    return res.status(401).json({ error: "Incorrect PIN for this profile" })
  }

  if (action === "save") {
    const updated = {
      ...existing,
      game: sanitizeGameState(body.game),
      updatedAt: new Date().toISOString(),
    }
    await setJson(key, updated)
    return res.status(200).json({ ok: true })
  }

  return res.status(200).json({
    ok: true,
    profileName: existing.displayName || normalizedName,
    game: sanitizeGameState(existing.game),
    created: false,
  })
}
