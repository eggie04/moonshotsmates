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
