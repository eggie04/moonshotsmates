const { LEADERBOARD_CACHE_KEY, sanitizeLeaderboardCache, getJson } = require("./_moonshotStore")

function toPositiveInt(value, fallback) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(1, Math.floor(parsed))
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const pageSize = Math.min(50, toPositiveInt(req.query?.pageSize, 10))
  const page = toPositiveInt(req.query?.page, 1)

  const cache = sanitizeLeaderboardCache(await getJson(LEADERBOARD_CACHE_KEY, {}))
  const rows = Object.values(cache).sort((a, b) => b.score - a.score)

  const total = rows.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * pageSize
  const leaderboard = rows.slice(start, start + pageSize)

  return res.status(200).json({
    leaderboard,
    pagination: {
      page: safePage,
      pageSize,
      total,
      totalPages,
      hasPrev: safePage > 1,
      hasNext: safePage < totalPages,
    },
  })
}
