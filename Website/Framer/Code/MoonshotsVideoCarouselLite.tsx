import * as React from "react"

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export default function MoonshotsVideoCarouselLiteV2() {
  // AUTO-GENERATED START: latestMoonshotVideoItems
  const videos = [
    {
      id: "aMyubFA106U",
      title: "New Episode",
      url: "https://www.youtube.com/watch?v=aMyubFA106U",
      embedUrl: "https://www.youtube.com/embed/aMyubFA106U",
    },
    {
      id: "dtuPovnf4XQ",
      title: "New Episode",
      url: "https://www.youtube.com/watch?v=dtuPovnf4XQ",
      embedUrl: "https://www.youtube.com/embed/dtuPovnf4XQ",
    },
    {
      id: "I9c8STV7Hnw",
      title: "New Episode",
      url: "https://www.youtube.com/watch?v=I9c8STV7Hnw",
      embedUrl: "https://www.youtube.com/embed/I9c8STV7Hnw",
    },
    {
      id: "RCbJKkG_mZs",
      title: "Anthropic’s $65B Week, The AI Model Race, and ChatGPT Beats Doctors | EP #252",
      url: "https://www.youtube.com/watch?v=RCbJKkG_mZs",
      embedUrl: "https://www.youtube.com/embed/RCbJKkG_mZs",
    },
    {
      id: "D8ohmtB8MdI",
      title: "New Episode",
      url: "https://www.youtube.com/watch?v=D8ohmtB8MdI",
      embedUrl: "https://www.youtube.com/embed/D8ohmtB8MdI",
    },
  ]
  // AUTO-GENERATED END: latestMoonshotVideoItems
  const links = videos.map((video) => video.url)
  const [index, setIndex] = React.useState(0)
  const hasLinks = links.length > 0

  return (
    <div
      style={{
        width: "100%",
        padding: 16,
        borderRadius: 14,
        background: "#111827",
        color: "#FFFFFF",
      }}
    >
      <h3 style={{ margin: "0 0 10px" }}>Latest Moonshots Videos</h3>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button disabled={!hasLinks} onClick={() => setIndex((value) => (value - 1 + links.length) % links.length)}>
          Prev
        </button>
        <button disabled={!hasLinks} onClick={() => setIndex((value) => (value + 1) % links.length)}>
          Next
        </button>
      </div>
      {!hasLinks ? (
        <div style={{ opacity: 0.8 }}>No videos available yet.</div>
      ) : (
        <a href={links[index]} target="_blank" rel="noreferrer" style={{ color: "#7DD3FC" }}>
          Open current video
        </a>
      )}
    </div>
  )
}
