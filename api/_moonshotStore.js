const BASE_UPGRADES = [
  {
    id: "book",
    name: "Read Accelerando",
    desc: "+1 Idea per manual click",
    baseCost: 15,
    costMultiplier: 1.5,
    count: 0,
    isClickUpgrade: true,
    power: 1,
  },
  {
    id: "podcast",
    name: "Launch a Podcast",
    desc: "+5 Ideas per second automatically",
    baseCost: 100,
    costMultiplier: 1.15,
    count: 0,
    isClickUpgrade: false,
    power: 5,
  },
  {
    id: "openclaw",
    name: "Deploy OpenClaw Agent",
    desc: "+50 Ideas per second automatically",
    baseCost: 1000,
    costMultiplier: 1.15,
    count: 0,
    isClickUpgrade: false,
    power: 50,
  },
  {
    id: "affiliate",
    name: "AI Affiliate Network",
    desc: "+500 Ideas per second automatically",
    baseCost: 10000,
    costMultiplier: 1.15,
    count: 0,
    isClickUpgrade: false,
    power: 500,
  },
]

const MEMORY_STORE = globalThis.__moonshotMemoryStore || new Map()
globalThis.__moonshotMemoryStore = MEMORY_STORE

const KV_URL = process.env.KV_REST_API_URL
const KV_TOKEN = process.env.KV_REST_API_TOKEN

function defaultState() {
  return {
    ideas: 0,
    ideasPerClick: 1,
    ideasPerSecond: 0,
    upgrades: BASE_UPGRADES.map((upgrade) => ({ ...upgrade })),
  }
}

function sanitizeGameState(input) {
  if (!input || typeof input !== "object") return defaultState()

  const upgrades = Array.isArray(input.upgrades)
    ? BASE_UPGRADES.map((upgrade, index) => {
        const incoming = input.upgrades[index] || {}
        return {
          ...upgrade,
          ...incoming,
          count: Math.max(0, Number(incoming.count) || 0),
        }
      })
    : BASE_UPGRADES.map((upgrade) => ({ ...upgrade }))

  return {
    ideas: Math.max(0, Number(input.ideas) || 0),
    ideasPerClick: Math.max(1, Number(input.ideasPerClick) || 1),
    ideasPerSecond: Math.max(0, Number(input.ideasPerSecond) || 0),
    upgrades,
  }
}

async function kvGet(key) {
  if (!KV_URL || !KV_TOKEN) return null
  const response = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
    cache: "no-store",
  })
  if (!response.ok) throw new Error(`KV GET failed (${response.status})`)
  const payload = await response.json()
  return payload?.result ?? null
}

async function kvSet(key, value) {
  if (!KV_URL || !KV_TOKEN) return false
  const response = await fetch(`${KV_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
    cache: "no-store",
  })
  if (!response.ok) throw new Error(`KV SET failed (${response.status})`)
  return true
}

async function getJson(key, fallbackValue) {
  try {
    const raw = await kvGet(key)
    if (raw !== null) return JSON.parse(raw)
  } catch (_) {}

  const localRaw = MEMORY_STORE.get(key)
  if (!localRaw) return fallbackValue

  try {
    return JSON.parse(localRaw)
  } catch (_) {
    return fallbackValue
  }
}

async function setJson(key, value) {
  const raw = JSON.stringify(value)
  let saved = false

  try {
    saved = await kvSet(key, raw)
  } catch (_) {}

  if (!saved) MEMORY_STORE.set(key, raw)
}

function normalizeAccountName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 24)
}

function accountKey(normalizedName) {
  return `moonshot:account:${normalizedName}`
}

const ACCOUNT_INDEX_KEY = "moonshot:account-index:v1"

function sanitizeAccountIndex(input) {
  if (!Array.isArray(input)) return []
  return input
    .map((row) => {
      const normalizedName = normalizeAccountName(row?.normalizedName)
      if (!normalizedName) return null
      const displayName = String(row?.displayName || normalizedName).trim().slice(0, 24) || normalizedName
      return { normalizedName, displayName }
    })
    .filter(Boolean)
}

module.exports = {
  ACCOUNT_INDEX_KEY,
  defaultState,
  sanitizeGameState,
  sanitizeAccountIndex,
  getJson,
  setJson,
  normalizeAccountName,
  accountKey,
}
