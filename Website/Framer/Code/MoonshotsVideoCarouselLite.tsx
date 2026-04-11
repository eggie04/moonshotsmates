import * as React from "react"

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export default function MoonshotsVideoCarouselLiteV2() {
  // AUTO-GENERATED START: latestMoonshotVideoItems
  const videos = [
    {
      id: "cFI-SqnvQK8",
      title: "SpaceX Goes Public, Claude’s Mythos Release, and the US Data Center Delay | EP #246",
      url: "https://www.youtube.com/watch?v=cFI-SqnvQK8",
      embedUrl: "https://www.youtube.com/embed/cFI-SqnvQK8",
    },
    {
      id: "Goa6c6Qz__I",
      title: "How AI Is Building a Platform to Design Living Things | Ben Lamm (Colossal) | EP #245",
      url: "https://www.youtube.com/watch?v=Goa6c6Qz__I",
      embedUrl: "https://www.youtube.com/embed/Goa6c6Qz__I",
    },
    {
      id: "Mh9yC4j0_rI",
      title: "Uber’s Robotaxi Playbook, 20M Workers by 2035 & AI Won’t Replace Everyone | Dara Khosrowshahi | 244",
      url: "https://www.youtube.com/watch?v=Mh9yC4j0_rI",
      embedUrl: "https://www.youtube.com/embed/Mh9yC4j0_rI",
    },
    {
      id: "fzKVYNBg50E",
      title: "Why Owning a Car Won't Make Sense, Robotaxi Plans, and Uber’s Trillion $ Market | Dara Khosrowshahi",
      url: "https://www.youtube.com/watch?v=fzKVYNBg50E",
      embedUrl: "https://www.youtube.com/embed/fzKVYNBg50E",
    },
    {
      id: "wMLcIWLlcWg",
      title: "Elon's $5 Trillion Bet, the End of Human Drivers, and Chamath's Market Warning | EP #242",
      url: "https://www.youtube.com/watch?v=wMLcIWLlcWg",
      embedUrl: "https://www.youtube.com/embed/wMLcIWLlcWg",
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
