// Shared, opt-in video behavior. No autoplay is requested for ordinary gameplay clips.
if (!window.__projectMedia) {
  window.__projectMedia = true
  let cleanup = () => {}
  const init = () => {
    cleanup()
    const videos = [...document.querySelectorAll("video[data-project-video]")]
    if (!videos.length || !("IntersectionObserver" in window)) return
    const motion = matchMedia("(prefers-reduced-motion: reduce)")
    const visible = new Set()
    const update = () => {
      for (const video of videos) {
        if (document.hidden || !visible.has(video)) video.pause()
        else if (video.hasAttribute("data-project-preview") && !motion.matches) {
          video.muted = true
          video.play().catch(() => {})
        } else if (video.hasAttribute("data-project-preview") && motion.matches) video.pause()
      }
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target)
        update()
      },
      { threshold: 0.15 },
    )
    videos.forEach((video) => observer.observe(video))
    document.addEventListener("visibilitychange", update)
    motion.addEventListener("change", update)
    cleanup = () => {
      observer.disconnect()
      videos.forEach((video) => video.pause())
      document.removeEventListener("visibilitychange", update)
      motion.removeEventListener("change", update)
    }
  }
  init()
  document.addEventListener("nav", init)
}
