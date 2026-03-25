import * as React from "react"

export default function MoonshotsCard() {
  return (
    <div
      style={{
        width: "100%",
        padding: 20,
        borderRadius: 16,
        background: "linear-gradient(135deg, #1A2A6C 0%, #2A5298 100%)",
        color: "#fff",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <h3 style={{ margin: 0, fontSize: 22, lineHeight: 1.2 }}>MoonshotsMates</h3>
      <p style={{ margin: "10px 0 0", opacity: 0.9 }}>
        Connected from local code sync.
      </p>
    </div>
  )
}
