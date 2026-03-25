import * as React from "react"

type Upgrade = {
  id: string
  name: string
  desc: string
  baseCost: number
  costMultiplier: number
  count: number
  isClickUpgrade: boolean
  power: number
}

type GameState = {
  ideas: number
  ideasPerClick: number
  ideasPerSecond: number
  upgrades: Upgrade[]
}

type LeaderboardEntry = {
  name: string
  score: number
  createdAt: string
}

const SAVE_KEY = "moonshotSimulatorStateV2"
const LEADERBOARD_KEY = "moonshotSimulatorLeaderboardV1"

const baseUpgrades: Upgrade[] = [
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

function defaultState(): GameState {
  return {
    ideas: 0,
    ideasPerClick: 1,
    ideasPerSecond: 0,
    upgrades: baseUpgrades.map((upgrade) => ({ ...upgrade })),
  }
}

function costFor(upgrade: Upgrade): number {
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.count))
}

export default function MoonshotSimulator() {
  const [game, setGame] = React.useState<GameState>(() => defaultState())
  const [playerName, setPlayerName] = React.useState("")
  const [leaderboard, setLeaderboard] = React.useState<LeaderboardEntry[]>([])
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)

    try {
      const saved = localStorage.getItem(SAVE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as GameState
        setGame({
          ideas: Number(parsed.ideas) || 0,
          ideasPerClick: Number(parsed.ideasPerClick) || 1,
          ideasPerSecond: Number(parsed.ideasPerSecond) || 0,
          upgrades: Array.isArray(parsed.upgrades)
            ? parsed.upgrades.map((upgrade, index) => ({
                ...baseUpgrades[index],
                ...upgrade,
                count: Number(upgrade.count) || 0,
              }))
            : baseUpgrades.map((upgrade) => ({ ...upgrade })),
        })
      }

      const savedLeaderboard = localStorage.getItem(LEADERBOARD_KEY)
      if (savedLeaderboard) {
        const parsed = JSON.parse(savedLeaderboard) as LeaderboardEntry[]
        if (Array.isArray(parsed)) {
          setLeaderboard(parsed)
        }
      }
    } catch {
      setGame(defaultState())
      setLeaderboard([])
    }
  }, [])

  React.useEffect(() => {
    if (!mounted) return

    const timer = window.setInterval(() => {
      setGame((previous) => ({ ...previous, ideas: previous.ideas + previous.ideasPerSecond }))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [mounted])

  React.useEffect(() => {
    if (!mounted) return
    localStorage.setItem(SAVE_KEY, JSON.stringify(game))
  }, [game, mounted])

  React.useEffect(() => {
    if (!mounted) return
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard))
  }, [leaderboard, mounted])

  const clickBrainstorm = () => {
    setGame((previous) => ({ ...previous, ideas: previous.ideas + previous.ideasPerClick }))
  }

  const buyUpgrade = (index: number) => {
    setGame((previous) => {
      const upgrade = previous.upgrades[index]
      if (!upgrade) return previous

      const currentCost = costFor(upgrade)
      if (previous.ideas < currentCost) return previous

      const upgrades = previous.upgrades.map((item, itemIndex) =>
        itemIndex === index ? { ...item, count: item.count + 1 } : item
      )

      const ideasPerClick = upgrade.isClickUpgrade ? previous.ideasPerClick + upgrade.power : previous.ideasPerClick
      const ideasPerSecond = !upgrade.isClickUpgrade ? previous.ideasPerSecond + upgrade.power : previous.ideasPerSecond

      return {
        ideas: previous.ideas - currentCost,
        ideasPerClick,
        ideasPerSecond,
        upgrades,
      }
    })
  }

  const hardReset = () => {
    if (!window.confirm("Reset simulator progress? This cannot be undone.")) return
    localStorage.removeItem(SAVE_KEY)
    setGame(defaultState())
  }

  const submitScore = () => {
    const trimmed = playerName.trim()
    if (!trimmed) return

    const score = Math.floor(game.ideas)
    const next: LeaderboardEntry[] = [
      ...leaderboard,
      { name: trimmed.slice(0, 24), score, createdAt: new Date().toISOString() },
    ]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)

    setLeaderboard(next)
    setPlayerName("")
  }

  const clearLeaderboard = () => {
    if (!window.confirm("Clear local leaderboard entries?")) return
    localStorage.removeItem(LEADERBOARD_KEY)
    setLeaderboard([])
  }

  return (
    <div style={wrapStyle}>
      <h2 style={{ margin: 0, fontSize: 28 }}>Moonshot Simulator</h2>

      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 42, fontWeight: 800, color: "#00FFCC" }}>{Math.floor(game.ideas).toLocaleString()}</div>
        <div style={{ opacity: 0.9 }}>Total Ideas Generated</div>
        <div style={{ marginTop: 6, color: "#9BB3C9" }}>{game.ideasPerSecond.toLocaleString()} Ideas / sec</div>
      </div>

      <button style={mainButtonStyle} onClick={clickBrainstorm}>
        GENERATE IDEA
      </button>

      <div style={upgradesStyle}>
        {game.upgrades.map((upgrade, index) => {
          const currentCost = costFor(upgrade)
          const disabled = game.ideas < currentCost

          return (
            <button
              key={upgrade.id}
              onClick={() => buyUpgrade(index)}
              disabled={disabled}
              style={{ ...upgradeButtonStyle, opacity: disabled ? 0.55 : 1 }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>
                  {upgrade.name} (Owned: {upgrade.count})
                </div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>{upgrade.desc}</div>
              </div>
              <div style={{ fontWeight: 700, color: "#FF8E8E", textAlign: "right" }}>
                {currentCost.toLocaleString()} Ideas
              </div>
            </button>
          )
        })}
      </div>

      <div style={leaderboardWrapStyle}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>Leaderboard</div>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <input
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
            placeholder="Name"
            style={inputStyle}
            maxLength={24}
          />
          <button style={smallActionButtonStyle} onClick={submitScore}>
            Save Score
          </button>
          <button style={smallActionButtonStyle} onClick={clearLeaderboard}>
            Clear Board
          </button>
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
          {leaderboard.length === 0 ? (
            <div style={{ opacity: 0.75, fontSize: 14 }}>No scores yet. Set the first benchmark.</div>
          ) : (
            leaderboard.map((entry, index) => (
              <div key={`${entry.name}-${entry.createdAt}-${index}`} style={leaderboardRowStyle}>
                <span>
                  {index + 1}. {entry.name}
                </span>
                <span>{Math.floor(entry.score).toLocaleString()}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <button style={resetButtonStyle} onClick={hardReset}>
        Hard Reset Progress
      </button>
      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>Game auto-saves every second.</div>
    </div>
  )
}

const wrapStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 760,
  margin: "0 auto",
  padding: 20,
  borderRadius: 14,
  border: "2px solid #333",
  backgroundColor: "#121212",
  color: "#E0E0E0",
  fontFamily: "Courier New, Courier, monospace",
  textAlign: "center",
  boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
}

const mainButtonStyle: React.CSSProperties = {
  marginTop: 14,
  background: "linear-gradient(145deg, #1e1e1e, #2a2a2a)",
  border: "2px solid #00FFCC",
  color: "#00FFCC",
  fontSize: 22,
  fontWeight: 700,
  padding: "16px 28px",
  borderRadius: 50,
  cursor: "pointer",
}

const upgradesStyle: React.CSSProperties = {
  marginTop: 22,
  display: "grid",
  gap: 10,
}

const upgradeButtonStyle: React.CSSProperties = {
  backgroundColor: "#1E1E1E",
  border: "1px solid #444",
  color: "#FFFFFF",
  padding: 14,
  borderRadius: 8,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  cursor: "pointer",
  textAlign: "left",
}

const leaderboardWrapStyle: React.CSSProperties = {
  marginTop: 22,
  borderTop: "1px solid #2B2B2B",
  paddingTop: 16,
  textAlign: "left",
}

const leaderboardRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "#1A1A1A",
  border: "1px solid #2D2D2D",
  borderRadius: 6,
  padding: "8px 10px",
  fontSize: 14,
}

const inputStyle: React.CSSProperties = {
  flex: "1 1 180px",
  minWidth: 140,
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #3A3A3A",
  background: "#111",
  color: "#EEE",
  fontFamily: "inherit",
}

const smallActionButtonStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #3F5E86",
  background: "#162233",
  color: "#D6E9FF",
  cursor: "pointer",
  fontFamily: "inherit",
}

const resetButtonStyle: React.CSSProperties = {
  marginTop: 24,
  background: "transparent",
  color: "#FF5555",
  border: "1px solid #FF5555",
  padding: "8px 14px",
  borderRadius: 5,
  cursor: "pointer",
  fontFamily: "inherit",
}
