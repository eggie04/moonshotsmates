import * as React from "react"

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 960
 * @framerIntrinsicHeight 420
 */
export default function MoonshotsCarouselDrop() {
  const videos = [
    "https://www.youtube.com/watch?v=DpwmmXmzvfo",
    "https://www.youtube.com/watch?v=J7_mYJm5lEk",
    "https://www.youtube.com/watch?v=uOGHXAfvK8w",
  ]
  const [index, setIndex] = React.useState(0)

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#0f172a",
        color: "#fff",
        borderRadius: 16,
        padding: 16,
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <strong>Moonshots Carousel</strong>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setIndex((value) => (value - 1 + videos.length) % videos.length)}>Prev</button>
          <button onClick={() => setIndex((value) => (value + 1) % videos.length)}>Next</button>
        </div>
      </div>
      <div style={{ width: "100%", height: "calc(100% - 56px)", background: "#000", borderRadius: 10, overflow: "hidden" }}>
        <iframe
          key={videos[index]}
          src={videos[index].replace("watch?v=", "embed/") + "?rel=0"}
          style={{ width: "100%", height: "100%", border: 0 }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          title="Moonshots video"
        />
      </div>
    </div>
  )
}
