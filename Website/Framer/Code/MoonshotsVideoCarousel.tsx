import * as React from "react"

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export default function MoonshotsVideoCarousel() {
  // AUTO-GENERATED START: latestMoonshotVideoItems
  const videos = [
    {
      id: "BX9ofqxmeYw",
      title: "SpaceX IPOs at $2.89T Market Cap, US Govt Suspends Fable & Mythos 5, Altman Delays OpenAI’s IPO |265",
      url: "https://www.youtube.com/watch?v=BX9ofqxmeYw",
      embedUrl: "https://www.youtube.com/embed/BX9ofqxmeYw",
    },
    {
      id: "isd2y37j8v4",
      title: "Brian Armstrong on Bitcoin, Anthropic Drops Fable 5 & Mythos 5, NewLimit's $435M Age-Reversal | 264",
      url: "https://www.youtube.com/watch?v=isd2y37j8v4",
      embedUrl: "https://www.youtube.com/embed/isd2y37j8v4",
    },
    {
      id: "P2HJEz3oqLs",
      title: "Emerging Situation: Anthropic's Global Pause, Recursive Self-Improvement, and AI Personhood Arrives",
      url: "https://www.youtube.com/watch?v=P2HJEz3oqLs",
      embedUrl: "https://www.youtube.com/embed/P2HJEz3oqLs",
    },
    {
      id: "hyeoYsVl1No",
      title: "Anthropic Files $965B IPO, Trump Signs AI Executive Order, and ChatGPT Crosses 1B Users | EP #262",
      url: "https://www.youtube.com/watch?v=hyeoYsVl1No",
      embedUrl: "https://www.youtube.com/embed/hyeoYsVl1No",
    },
    {
      id: "XjzowGpF628",
      title: "Ray Kurzweil on Why We’re Living in the Singularity | EP #261",
      url: "https://www.youtube.com/watch?v=XjzowGpF628",
      embedUrl: "https://www.youtube.com/embed/XjzowGpF628",
    },
  ]
  // AUTO-GENERATED END: latestMoonshotVideoItems
  const [index, setIndex] = React.useState(0)
  const touchStartX = React.useRef(null as number | null)

  const hasVideos = videos.length > 0
  const active = hasVideos ? videos[index] : null

  const next = React.useCallback(() => {
    if (!hasVideos) return
    setIndex((value) => (value + 1) % videos.length)
  }, [hasVideos, videos.length])

  const previous = React.useCallback(() => {
    if (!hasVideos) return
    setIndex((value) => (value - 1 + videos.length) % videos.length)
  }, [hasVideos, videos.length])

  const onTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null
  }

  const onTouchEnd = (event: React.TouchEvent) => {
    if (touchStartX.current == null) return
    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current
    const delta = endX - touchStartX.current
    touchStartX.current = null

    if (Math.abs(delta) < 40) return
    if (delta < 0) next()
    if (delta > 0) previous()
  }

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        width: "100%",
        maxWidth: 980,
        margin: "0 auto",
        padding: 16,
        borderRadius: 20,
        background: "linear-gradient(165deg, #0F1115 0%, #151B26 100%)",
        color: "#F6F7F9",
        fontFamily: "Inter, system-ui, sans-serif",
        boxShadow: "0 12px 28px rgba(0,0,0,0.30)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 22, lineHeight: 1.2 }}>Latest Moonshots Videos</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={previous} style={navButton} aria-label="Previous video">
            ←
          </button>
          <button onClick={next} style={navButton} aria-label="Next video">
            →
          </button>
        </div>
      </div>

      {!active ? (
        <p style={{ margin: "14px 0 4px", opacity: 0.85 }}>No videos available yet.</p>
      ) : (
        <>
          <div
            style={{
              marginTop: 14,
              position: "relative",
              width: "100%",
              paddingBottom: "56.25%",
              borderRadius: 14,
              overflow: "hidden",
              background: "#000",
            }}
          >
            <iframe
              key={active.id}
              src={`${active.embedUrl}?rel=0`}
              title={active.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700, lineHeight: 1.35 }}>{active.title}</div>
            <a
              href={active.url}
              target="_blank"
              rel="noreferrer"
              style={{ color: "#61D0FF", textDecoration: "none", fontSize: 14 }}
            >
              Watch on YouTube
            </a>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            {videos.map((video, dotIndex) => (
              <button
                key={video.id}
                onClick={() => setIndex(dotIndex)}
                aria-label={`Go to video ${dotIndex + 1}`}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  border: "none",
                  cursor: "pointer",
                  background: dotIndex === index ? "#61D0FF" : "#38485F",
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const navButton: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 9,
  border: "1px solid #38485F",
  background: "#1A2331",
  color: "#DCEAFF",
  cursor: "pointer",
  fontSize: 18,
  lineHeight: "34px",
  textAlign: "center",
  padding: 0,
}
