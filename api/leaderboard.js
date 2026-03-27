const { LEADERBOARD_KEY, sanitizeLeaderboard, getJson, setJson } = require("./_moonshotStore")

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    const leaderboard = sanitizeLeaderboard(await getJson(LEADERBOARD_KEY, []))
    return res.status(200).json({ leaderboard: leaderboard.slice(0, 10) })
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const rawName = String(req.body?.name || "").trim().slice(0, 24)
  const score = Math.max(0, Math.floor(Number(req.body?.score) || 0))
  if (!rawName) return res.status(400).json({ error: "Name is required" })

  const entry = {
    name: rawName,
    score,
    createdAt: new Date().toISOString(),
  }

  const existing = sanitizeLeaderboard(await getJson(LEADERBOARD_KEY, []))
  const merged = sanitizeLeaderboard([...existing, entry])

  await setJson(LEADERBOARD_KEY, merged)
  return res.status(200).json({ leaderboard: merged.slice(0, 10) })
}
