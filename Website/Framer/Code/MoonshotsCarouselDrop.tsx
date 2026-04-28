import * as React from "react"

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 960
 * @framerIntrinsicHeight 420
 */
export default function MoonshotsCarouselDrop() {
  // AUTO-GENERATED START: latestMoonshotVideoItems
  const videos = [
    {
      id: "D8ohmtB8MdI",
      title: "New Episode",
      url: "https://www.youtube.com/watch?v=D8ohmtB8MdI",
      embedUrl: "https://www.youtube.com/embed/D8ohmtB8MdI",
    },
    {
      id: "4IM866W7yGc",
      title: "Age Reversal in 2026: The Longevity Singularity & David’s Updated Protocols | David Sinclair EP #250",
      url: "https://www.youtube.com/watch?v=4IM866W7yGc",
      embedUrl: "https://www.youtube.com/embed/4IM866W7yGc",
    },
    {
      id: "Bj0i-yvIUQs",
      title: "Iran's AI Supply Chain Threat, Claude vs. SaaS, and Elon's $60B Cursor Bet | EP #249",
      url: "https://www.youtube.com/watch?v=Bj0i-yvIUQs",
      embedUrl: "https://www.youtube.com/embed/Bj0i-yvIUQs",
    },
    {
      id: "LVvleNtllPk",
      title: "Amazon Takes on Starlink, Opus 4.7 vs. Mythos, and Stanford's AI Scorecard | #248",
      url: "https://www.youtube.com/watch?v=LVvleNtllPk",
      embedUrl: "https://www.youtube.com/embed/LVvleNtllPk",
    },
    {
      id: "5ak26W2YNRY",
      title: "Elon Musk vs. Sam Altman, AI Job Loss, and OpenAI’s $852B Valuation | EP #247",
      url: "https://www.youtube.com/watch?v=5ak26W2YNRY",
      embedUrl: "https://www.youtube.com/embed/5ak26W2YNRY",
    },
  ]
  // AUTO-GENERATED END: latestMoonshotVideoItems
  const [index, setIndex] = React.useState(0)
  const [playing, setPlaying] = React.useState(false)
  const hasVideos = videos.length > 0
  const activeVideo = hasVideos ? videos[index] : null
  const activeEmbedUrl = activeVideo ? `${activeVideo.embedUrl}?rel=0${playing ? "&autoplay=1" : ""}` : null
  const label = hasVideos ? `EPISODE ${index + 1} OF ${videos.length}` : "NO EPISODES"

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        maxWidth: 980,
        margin: "0 auto",
        boxSizing: "border-box",
        background: "radial-gradient(140% 100% at 0% 120%, rgba(96, 214, 255, 0.25) 0%, rgba(4, 10, 20, 0) 45%), linear-gradient(180deg, #122a57 0%, #061534 100%)",
        color: "#F9FCFF",
        border: "1px solid rgba(115, 170, 255, 0.28)",
        borderRadius: 20,
        padding: 10,
        fontFamily: "Inter, system-ui, sans-serif",
        boxShadow: "0 20px 48px rgba(2, 10, 30, 0.42)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 10, flex: "0 0 auto" }}>
        <div>
          <div
            style={{
              display: "inline-flex",
              padding: "4px 10px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.08)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.4,
            }}
          >
            MOONSHOTS TV
          </div>
          <h3 style={{ margin: "6px 0 0", fontSize: "clamp(28px, 4vw, 48px)", lineHeight: 1.02, fontWeight: 800 }}>Latest Episodes</h3>
          <p style={{ margin: "4px 0 0", opacity: 0.84, fontSize: "clamp(12px, 1.8vw, 16px)", lineHeight: 1.25 }}>
            Fast ideas, frontier tech, and what matters next.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            disabled={!hasVideos}
            onClick={() => {
              setIndex((value) => (value - 1 + videos.length) % videos.length)
              setPlaying(false)
            }}
            style={navButton}
            aria-label="Previous episode"
          >
            &lt;
          </button>
          <button
            disabled={!hasVideos}
            onClick={() => {
              setIndex((value) => (value + 1) % videos.length)
              setPlaying(false)
            }}
            style={navButton}
            aria-label="Next episode"
          >
            &gt;
          </button>
        </div>
      </div>

      <div style={{ width: "100%", flex: "1 1 auto", minHeight: 0, borderRadius: 14, overflow: "hidden", background: "#000" }}>
        {!activeEmbedUrl || !activeVideo ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 18, opacity: 0.85 }}>
            No videos available yet.
          </div>
        ) : (
          <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <iframe
              key={activeVideo.id + String(playing)}
              src={activeEmbedUrl}
              style={{ width: "100%", height: "100%", border: 0 }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              title={activeVideo.title}
            />

            {!playing && (
              <button
                onClick={() => setPlaying(true)}
                aria-label="Play video"
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 78,
                  height: 56,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.22)",
                  background: "rgba(255, 18, 18, 0.9)",
                  color: "#fff",
                  fontSize: 24,
                  cursor: "pointer",
                }}
              >
                ▶
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: 8, flex: "0 0 auto", minHeight: 46 }}>
        <div style={{ fontSize: 10, letterSpacing: 0.45, opacity: 0.82, fontWeight: 600 }}>{label}</div>
        <div
          style={{
            marginTop: 2,
            fontSize: "clamp(13px, 1.65vw, 24px)",
            lineHeight: 1.15,
            fontWeight: 700,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {activeVideo?.title ?? "Moonshots Episode"}
        </div>
      </div>

      <div style={{ marginTop: 8, display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2, flex: "0 0 auto" }}>
        {videos.map((video, thumbIndex) => (
          <button
            key={video.id}
            aria-label={`View episode ${thumbIndex + 1}`}
            onClick={() => {
              setIndex(thumbIndex)
              setPlaying(false)
            }}
            style={{
              flex: "0 0 auto",
              width: 68,
              height: 40,
              borderRadius: 8,
              border: thumbIndex === index ? "2px solid #67F6DF" : "1px solid rgba(255,255,255,0.3)",
              overflow: "hidden",
              padding: 0,
              cursor: "pointer",
              background: "#09101e",
            }}
          >
            <img
              src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`}
              alt={video.title}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </button>
        ))}
      </div>
    </div>
  )
}

const navButton: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 12,
  border: "1px solid rgba(207,224,255,0.35)",
  background: "rgba(5, 20, 45, 0.52)",
  color: "#e9f2ff",
  cursor: "pointer",
  fontSize: 18,
  fontWeight: 700,
}
