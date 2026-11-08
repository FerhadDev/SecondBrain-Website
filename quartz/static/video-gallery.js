if (!window.__featuredVideoGallery) {
  window.__featuredVideoGallery = true
  let cleanup = () => {}
  const posterCache = new Map()
  let posterQueue = Promise.resolve()
  const init = () => {
    cleanup()
    const stops = [],
      motion = matchMedia("(prefers-reduced-motion: reduce)")
    const listen = (target, name, fn, options) => {
      target.addEventListener(name, fn, options)
      stops.push(() => target.removeEventListener(name, fn, options))
    }
    const pauseOthers = (event) => {
      if (event.target.hasAttribute("data-project-preview")) {
        if (
          [...document.querySelectorAll("video[data-featured-video]")].some(
            (video) => !video.paused,
          )
        )
          event.target.pause()
        return
      }
      document.querySelectorAll("video").forEach((video) => {
        if (video !== event.target) video.pause()
      })
    }
    listen(document, "play", pauseOthers, true)
    for (const gallery of document.querySelectorAll("[data-featured-video-gallery]")) {
      const video = gallery.querySelector("[data-featured-video]"),
        buttons = [...gallery.querySelectorAll("[data-video-select]")]
      if (!video || !buttons.length) continue
      const entries = buttons.map((button) => JSON.parse(button.dataset.videoItem))
      let selected = 0,
        destroyed = false
      const status = gallery.querySelector("[data-video-status]"),
        start = gallery.querySelector("[data-video-start]"),
        stage = gallery.querySelector("[data-video-stage]")
      const initial = entries[0]
      const setRange = () => {
        const entry = entries[selected]
        if (
          entry.start &&
          (video.currentTime < entry.start || video.currentTime >= (entry.end ?? Infinity))
        )
          video.currentTime = entry.start
      }
      const hydrate = () => {
        if (!video.getAttribute("src")) {
          video.preload = "metadata"
          video.src = entries[selected].src
          video.load()
        }
      }
      const select = (index) => {
        if (index === selected) return
        video.pause()
        selected = index
        const entry = entries[index]
        video.muted = true
        video.loop = entry.loop
        video.removeAttribute("autoplay")
        video.poster = entry.poster || posterCache.get(entry.src + "#" + (entry.start || 0)) || ""
        video.preload = "metadata"
        video.src = entry.src
        video.load()
        buttons.forEach((button, i) => {
          button.classList.toggle("is-active", i === index)
          button.setAttribute("aria-pressed", String(i === index))
          button.querySelector("[data-video-preview-state]").textContent =
            i === index ? "Selected" : "Play clip"
        })
        gallery.querySelector("[data-video-title]").textContent = entry.title
        gallery.querySelector("[data-video-description]").textContent = entry.description
        gallery.querySelector("[data-video-position]").textContent =
          String(index + 1).padStart(2, "0") + " / " + String(entries.length).padStart(2, "0")
        const duration = entry.duration
        gallery.querySelector("[data-video-duration]").textContent =
          typeof duration === "number"
            ? Math.floor(duration / 60) + ":" + String(Math.floor(duration % 60)).padStart(2, "0")
            : ""
        video.setAttribute("aria-label", entry.title)
        start.setAttribute("aria-label", "Play " + entry.title)
        gallery
          .querySelector("[data-video-fullscreen]")
          .setAttribute("aria-label", "Fullscreen " + entry.title)
        start.hidden = false
        status.textContent = "Selected " + entry.title + ". Press play to begin."
        stage.classList.remove("is-switching")
        if (!motion.matches) {
          void stage.offsetWidth
          stage.classList.add("is-switching")
        }
      }
      buttons.forEach((button, index) => {
        listen(button, "click", () => select(index))
        listen(button, "keydown", (event) => {
          let next
          if (event.key === "ArrowRight" || event.key === "ArrowDown")
            next = (index + 1) % buttons.length
          else if (event.key === "ArrowLeft" || event.key === "ArrowUp")
            next = (index + buttons.length - 1) % buttons.length
          else if (event.key === "Home") next = 0
          else if (event.key === "End") next = buttons.length - 1
          if (next !== undefined) {
            event.preventDefault()
            buttons[next].focus()
            select(next)
          }
        })
      })
      listen(start, "click", async () => {
        hydrate()
        try {
          await video.play()
        } catch {
          status.textContent = "Playback could not start. Use the player controls to retry."
        }
      })
      listen(video, "pointerdown", hydrate)
      listen(video, "loadedmetadata", () => {
        setRange()
        status.textContent = entries[selected].title + " ready to play."
      })
      listen(video, "play", () => {
        start.hidden = true
        status.textContent = "Playing " + entries[selected].title
      })
      listen(video, "pause", () => {
        status.textContent = "Paused " + entries[selected].title
      })
      listen(video, "ended", () => {
        start.hidden = false
        status.textContent = "Recording finished."
      })
      listen(video, "timeupdate", () => {
        const entry = entries[selected]
        if (entry.start && video.readyState > 0 && video.currentTime < entry.start) {
          video.currentTime = entry.start
          return
        }
        if (entry.end && video.currentTime >= entry.end) {
          if (entry.loop) {
            video.currentTime = entry.start
          } else {
            video.pause()
            video.removeAttribute("src")
            video.preload = "none"
            video.load()
            start.hidden = false
            status.textContent = "Excerpt finished."
          }
        }
      })
      listen(video, "error", () => {
        start.hidden = false
        status.textContent = "This recording is unavailable. Select another clip or retry."
      })
      listen(gallery.querySelector("[data-video-fullscreen]"), "click", async () => {
        try {
          if (video.requestFullscreen) await video.requestFullscreen()
          else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen()
          else status.textContent = "Fullscreen is not available in this browser."
        } catch {
          status.textContent = "Fullscreen could not open. Use the player fullscreen control."
        }
      })
      const onHidden = () => {
        if (document.hidden) video.pause()
      }
      listen(document, "visibilitychange", onHidden)
      let visibility
      if ("IntersectionObserver" in window) {
        visibility = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) if (!entry.isIntersecting) video.pause()
          },
          { threshold: 0 },
        )
        visibility.observe(video)
        stops.push(() => visibility.disconnect())
      }
      // Missing posters are decoded one at a time only after a preview enters the viewport.
      const capture = async (index) => {
        const entry = entries[index]
        if (entry.poster || destroyed) return
        let poster = posterCache.get(entry.src)
        if (!poster) {
          const captureVideo = document.createElement("video")
          captureVideo.muted = true
          captureVideo.preload = "metadata"
          captureVideo.playsInline = true
          const timeout = (ms) =>
            new Promise((_, reject) => setTimeout(() => reject(Error("Preview timeout")), ms))
          try {
            await Promise.race([
              new Promise((resolve, reject) => {
                captureVideo.onloadedmetadata = resolve
                captureVideo.onerror = reject
                captureVideo.src = entry.src
              }),
              timeout(6000),
            ])
            await Promise.race([
              new Promise((resolve, reject) => {
                captureVideo.onseeked = resolve
                captureVideo.onerror = reject
                captureVideo.currentTime = Math.min(
                  Math.max(entry.start || 0, 1),
                  Math.max(0.01, captureVideo.duration - 0.05),
                )
              }),
              timeout(6000),
            ])
            const canvas = document.createElement("canvas")
            canvas.width = 480
            canvas.height = Math.round((480 * captureVideo.videoHeight) / captureVideo.videoWidth)
            canvas.getContext("2d").drawImage(captureVideo, 0, 0, canvas.width, canvas.height)
            poster = canvas.toDataURL("image/jpeg", 0.82)
            posterCache.set(entry.src + "#" + (entry.start || 0), poster)
          } catch {
          } finally {
            captureVideo.pause()
            captureVideo.removeAttribute("src")
            captureVideo.load()
          }
        }
        if (destroyed || !poster) return
        const fallback = buttons[index].querySelector("[data-thumbnail-fallback]")
        if (fallback) {
          const img = document.createElement("img")
          img.src = poster
          img.alt = ""
          fallback.replaceWith(img)
        }
        if (selected === index && !video.poster) video.poster = poster
      }
      let thumbnails
      if ("IntersectionObserver" in window) {
        thumbnails = new IntersectionObserver(
          (items) => {
            for (const item of items)
              if (item.isIntersecting) {
                const index = buttons.indexOf(item.target)
                thumbnails.unobserve(item.target)
                posterQueue = posterQueue.then(() => capture(index)).catch(() => {})
              }
          },
          { rootMargin: "80px" },
        )
        buttons.forEach((button) => thumbnails.observe(button))
        stops.push(() => thumbnails.disconnect())
      } else
        buttons.forEach((button, index) =>
          listen(button, "focus", () => {
            posterQueue = posterQueue.then(() => capture(index)).catch(() => {})
          }),
        )
      stops.push(() => {
        destroyed = true
        video.pause()
        video.removeAttribute("src")
        video.load()
      })
      if (initial.poster) video.poster = initial.poster
    }
    cleanup = () => {
      stops.forEach((stop) => stop())
      cleanup = () => {}
    }
  }
  init()
  document.addEventListener("nav", init)
}
