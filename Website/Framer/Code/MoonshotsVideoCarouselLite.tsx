import * as React from "react"

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export default function MoonshotsVideoCarouselLiteV2() {
  // AUTO-GENERATED START: latestMoonshotVideoItems
  const videos = [
    {
      id: "BX9ofqxmeYw",
      title: "New Episode",
      url: "https://www.youtube.com/watch?v=BX9ofqxmeYw",
      embedUrl: "https://www.youtube.com/embed/BX9ofqxmeYw",
    },
    {
      id: "isd2y37j8v4",
      title: "New Episode",
      url: "https://www.youtube.com/watch?v=isd2y37j8v4",
      embedUrl: "https://www.youtube.com/embed/isd2y37j8v4",
    },
    {
      id: "P2HJEz3oqLs",
      title: "New Episode",
      url: "https://www.youtube.com/watch?v=P2HJEz3oqLs",
      embedUrl: "https://www.youtube.com/embed/P2HJEz3oqLs",
    },
    {
      id: "hyeoYsVl1No",
      title: "New Episode",
      url: "https://www.youtube.com/watch?v=hyeoYsVl1No",
      embedUrl: "https://www.youtube.com/embed/hyeoYsVl1No",
    },
    {
      id: "XjzowGpF628",
      title: "New Episode",
      url: "https://www.youtube.com/watch?v=XjzowGpF628",
      embedUrl: "https://www.youtube.com/embed/XjzowGpF628",
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
