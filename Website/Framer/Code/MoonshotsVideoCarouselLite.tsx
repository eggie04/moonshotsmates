import * as React from "react"

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export default function MoonshotsVideoCarouselLiteV2() {
  // AUTO-GENERATED START: latestMoonshotVideoItems
  const videos = [
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
