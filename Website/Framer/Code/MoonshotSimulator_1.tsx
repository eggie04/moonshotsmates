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
const ACCOUNT_NAME_KEY = "moonshotSimulatorAccountNameV1"
const ACCOUNT_PIN_KEY = "moonshotSimulatorAccountPinV1"

const baseUpgrades: Upgrade[] = [
  { id: "book", name: "Read Accelerando", desc: "+1 Idea per manual click", baseCost: 15, costMultiplier: 1.5, count: 0, isClickUpgrade: true, power: 1 },
  { id: "podcast", name: "Launch a Podcast", desc: "+5 Ideas per second automatically", baseCost: 100, costMultiplier: 1.15, count: 0, isClickUpgrade: false, power: 5 },
  { id: "openclaw", name: "Deploy OpenClaw Agent", desc: "+50 Ideas per second automatically", baseCost: 1000, costMultiplier: 1.15, count: 0, isClickUpgrade: false, power: 50 },
  { id: "affiliate", name: "AI Affiliate Network", desc: "+500 Ideas per second automatically", baseCost: 10000, costMultiplier: 1.15, count: 0, isClickUpgrade: false, power: 500 },
]

function defaultState(): GameState {
  return { ideas: 0, ideasPerClick: 1, ideasPerSecond: 0, upgrades: baseUpgrades.map((upgrade) => ({ ...upgrade })) }
}

function sanitizeGameState(input: unknown): GameState {
  const parsed = (input || {}) as Partial<GameState>
  return {
    ideas: Math.max(0, Number(parsed.ideas) || 0),
    ideasPerClick: Math.max(1, Number(parsed.ideasPerClick) || 1),
    ideasPerSecond: Math.max(0, Number(parsed.ideasPerSecond) || 0),
    upgrades: Array.isArray(parsed.upgrades)
      ? baseUpgrades.map((upgrade, index) => {
          const incoming = (parsed.upgrades?.[index] || {}) as Partial<Upgrade>
          return { ...upgrade, ...incoming, count: Math.max(0, Number(incoming.count) || 0) }
        })
      : baseUpgrades.map((upgrade) => ({ ...upgrade })),
  }
}

function sanitizeLeaderboard(entries: unknown): LeaderboardEntry[] {
  if (!Array.isArray(entries)) return []
  return entries
    .map((entry) => {
      const row = (entry || {}) as Partial<LeaderboardEntry>
      const name = String(row.name || "").trim().slice(0, 24)
      if (!name) return null
      return { name, score: Math.max(0, Math.floor(Number(row.score) || 0)), createdAt: new Date(row.createdAt || Date.now()).toISOString() }
    })
    .filter((entry): entry is LeaderboardEntry => Boolean(entry))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
}

async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const response = await fetch("/api/leaderboard")
  if (!response.ok) throw new Error("Could not load leaderboard")
  const payload = (await response.json()) as { leaderboard?: unknown }
  return sanitizeLeaderboard(payload.leaderboard)
}

async function submitLeaderboardEntry(name: string, score: number): Promise<LeaderboardEntry[]> {
  const response = await fetch("/api/leaderboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, score }),
  })
  if (!response.ok) throw new Error("Could not save leaderboard")
  const payload = (await response.json()) as { leaderboard?: unknown }
  return sanitizeLeaderboard(payload.leaderboard)
}

async function loadAccount(name: string, pin: string): Promise<{ profileName: string; game: GameState }> {
  const response = await fetch("/api/account", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "load", name, pin }),
  })
  const payload = (await response.json()) as { error?: string; profileName?: string; game?: unknown }
  if (!response.ok) throw new Error(payload.error || "Could not sign in")
  return { profileName: payload.profileName || name.trim().slice(0, 24), game: sanitizeGameState(payload.game) }
}

async function saveAccountGame(name: string, pin: string, game: GameState): Promise<void> {
  await fetch("/api/account", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "save", name, pin, game }),
  })
}

function costFor(upgrade: Upgrade): number {
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.count))
}

export default function MoonshotSimulator() {
  const [game, setGame] = React.useState<GameState>(() => defaultState())
  const [leaderboard, setLeaderboard] = React.useState<LeaderboardEntry[]>([])
  const [playerName, setPlayerName] = React.useState("")
  const [profileNameInput, setProfileNameInput] = React.useState("")
  const [profilePinInput, setProfilePinInput] = React.useState("")
  const [signedInProfile, setSignedInProfile] = React.useState("")
  const [mounted, setMounted] = React.useState(false)
  const [hydrated, setHydrated] = React.useState(false)
  const [isSigningIn, setIsSigningIn] = React.useState(false)
  const [authError, setAuthError] = React.useState("")

  React.useEffect(() => {
    setMounted(true)
    let cancelled = false

    const run = async () => {
      try {
        const cachedBoard = await fetchLeaderboard()
        if (!cancelled) setLeaderboard(cachedBoard)
      } catch (_) {}

      try {
        const localGame = localStorage.getItem(SAVE_KEY)
        if (localGame && !cancelled) setGame(sanitizeGameState(JSON.parse(localGame)))
      } catch (_) {}

      const savedName = localStorage.getItem(ACCOUNT_NAME_KEY) || ""
      const savedPin = localStorage.getItem(ACCOUNT_PIN_KEY) || ""

      if (!savedName || !savedPin) {
        if (!cancelled) setHydrated(true)
        return
      }

      setProfileNameInput(savedName)
      setProfilePinInput(savedPin)
      try {
        const loaded = await loadAccount(savedName, savedPin)
        if (!cancelled) {
          setSignedInProfile(loaded.profileName)
          setPlayerName(loaded.profileName)
          setGame(loaded.game)
        }
      } catch (_) {
        localStorage.removeItem(ACCOUNT_NAME_KEY)
        localStorage.removeItem(ACCOUNT_PIN_KEY)
      } finally {
        if (!cancelled) setHydrated(true)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [])

  React.useEffect(() => {
    if (!mounted || !hydrated || !signedInProfile) return
    const timer = window.setInterval(() => {
      setGame((previous) => ({ ...previous, ideas: previous.ideas + previous.ideasPerSecond }))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [mounted, hydrated, signedInProfile])

  React.useEffect(() => {
    if (!mounted || !hydrated || !signedInProfile) return
    localStorage.setItem(SAVE_KEY, JSON.stringify(game))
  }, [game, mounted, hydrated, signedInProfile])

  React.useEffect(() => {
    if (!mounted || !hydrated || !signedInProfile) return
    const name = localStorage.getItem(ACCOUNT_NAME_KEY) || profileNameInput
    const pin = localStorage.getItem(ACCOUNT_PIN_KEY) || profilePinInput
    if (!name || !pin) return
    const timer = window.setTimeout(() => {
      void saveAccountGame(name, pin, game)
    }, 800)
    return () => window.clearTimeout(timer)
  }, [game, mounted, hydrated, signedInProfile, profileNameInput, profilePinInput])

  const signIn = async () => {
    const name = profileNameInput.trim()
    const pin = profilePinInput.trim()
    if (!name || pin.length < 4) {
      setAuthError("Enter a profile name and 4+ character PIN.")
      return
    }

    setIsSigningIn(true)
    setAuthError("")
    try {
      const loaded = await loadAccount(name, pin)
      localStorage.setItem(ACCOUNT_NAME_KEY, name)
      localStorage.setItem(ACCOUNT_PIN_KEY, pin)
      setSignedInProfile(loaded.profileName)
      setPlayerName((current) => current || loaded.profileName)
      setGame(loaded.game)
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Could not sign in")
    } finally {
      setIsSigningIn(false)
    }
  }

  const signOut = () => {
    localStorage.removeItem(ACCOUNT_NAME_KEY)
    localStorage.removeItem(ACCOUNT_PIN_KEY)
    setSignedInProfile("")
    setAuthError("")
    setGame(defaultState())
  }

  const clickBrainstorm = () => setGame((previous) => ({ ...previous, ideas: previous.ideas + previous.ideasPerClick }))

  const buyUpgrade = (index: number) => {
    setGame((previous) => {
      const upgrade = previous.upgrades[index]
      if (!upgrade) return previous
      const currentCost = costFor(upgrade)
      if (previous.ideas < currentCost) return previous

      const upgrades = previous.upgrades.map((item, itemIndex) => (itemIndex === index ? { ...item, count: item.count + 1 } : item))
      const ideasPerClick = upgrade.isClickUpgrade ? previous.ideasPerClick + upgrade.power : previous.ideasPerClick
      const ideasPerSecond = !upgrade.isClickUpgrade ? previous.ideasPerSecond + upgrade.power : previous.ideasPerSecond

      return { ideas: previous.ideas - currentCost, ideasPerClick, ideasPerSecond, upgrades }
    })
  }

  const submitScore = async () => {
    const effectiveName = (playerName.trim() || signedInProfile).slice(0, 24)
    if (!effectiveName) return
    try {
      const next = await submitLeaderboardEntry(effectiveName, Math.floor(game.ideas))
      setLeaderboard(next)
      setPlayerName(effectiveName)
    } catch (_) {}
  }

  return (
    <div style={wrapStyle}>
      <h2 style={{ margin: 0, fontSize: 28 }}>Moonshot Simulator</h2>

      {!signedInProfile ? (
        <div style={authWrapStyle}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Sign in to sync progress across devices</div>
          <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 10 }}>First sign-in with a new name creates your profile automatically.</div>
          <div style={{ display: "grid", gap: 8 }}>
            <input value={profileNameInput} onChange={(event) => setProfileNameInput(event.target.value)} placeholder="Profile Name" style={inputStyle} maxLength={24} />
            <input value={profilePinInput} onChange={(event) => setProfilePinInput(event.target.value)} placeholder="PIN (4+ chars)" type="password" style={inputStyle} maxLength={32} />
            <button style={smallActionButtonStyle} onClick={() => void signIn()} disabled={isSigningIn}>
              {isSigningIn ? "Signing In..." : "Sign In / Create Profile"}
            </button>
            {authError ? <div style={{ color: "#FF8E8E", fontSize: 13 }}>{authError}</div> : null}
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, opacity: 0.85 }}>Signed in as: {signedInProfile}</div>
          <button style={smallActionButtonStyle} onClick={signOut}>
            Sign Out
          </button>
        </div>
      )}

      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 42, fontWeight: 800, color: "#00FFCC" }}>{Math.floor(game.ideas).toLocaleString()}</div>
        <div style={{ opacity: 0.9 }}>Total Ideas Generated</div>
        <div style={{ marginTop: 6, color: "#9BB3C9" }}>{game.ideasPerSecond.toLocaleString()} Ideas / sec</div>
      </div>

      <button style={{ ...mainButtonStyle, opacity: signedInProfile ? 1 : 0.5, cursor: signedInProfile ? "pointer" : "not-allowed" }} onClick={clickBrainstorm} disabled={!signedInProfile}>
        GENERATE IDEA
      </button>

      <div style={upgradesStyle}>
        {game.upgrades.map((upgrade, index) => {
          const currentCost = costFor(upgrade)
          const disabled = !signedInProfile || game.ideas < currentCost
          return (
            <button key={upgrade.id} onClick={() => buyUpgrade(index)} disabled={disabled} style={{ ...upgradeButtonStyle, opacity: disabled ? 0.55 : 1 }}>
              <div>
                <div style={{ fontWeight: 700 }}>
                  {upgrade.name} (Owned: {upgrade.count})
                </div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>{upgrade.desc}</div>
              </div>
              <div style={{ fontWeight: 700, color: "#FF8E8E", textAlign: "right" }}>{currentCost.toLocaleString()} Ideas</div>
            </button>
          )
        })}
      </div>

      <div style={leaderboardWrapStyle}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>Leaderboard</div>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <input value={playerName} onChange={(event) => setPlayerName(event.target.value)} placeholder="Display Name (optional)" style={inputStyle} maxLength={24} />
          <button style={smallActionButtonStyle} onClick={() => void submitScore()} disabled={!signedInProfile}>
            Save Score
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

      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 12 }}>Progress auto-saves to cloud for your signed-in profile.</div>
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

const authWrapStyle: React.CSSProperties = {
  marginTop: 14,
  border: "1px solid #2D2D2D",
  borderRadius: 10,
  padding: 12,
  textAlign: "left",
  background: "#171717",
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
}

const upgradesStyle: React.CSSProperties = { marginTop: 22, display: "grid", gap: 10 }

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

const leaderboardWrapStyle: React.CSSProperties = { marginTop: 22, borderTop: "1px solid #2B2B2B", paddingTop: 16, textAlign: "left" }

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
