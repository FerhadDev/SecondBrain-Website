// Uses only Quartz's generated public index. No external data or graph edges.
if (!window.__portfolioGraph) {
  window.__portfolioGraph = true
  const init = async () => {
    for (const host of document.querySelectorAll(".brain-graph")) {
      if (host.dataset.ready) continue
      host.dataset.ready = "true"
      try {
        const response = await fetch(host.dataset.index)
        if (!response.ok) throw new Error("Index unavailable")
        const index = await response.json()
        if (!host.isConnected) continue
        const svg = host.querySelector("svg"),
          list = host.querySelector("ul")
        const base = new URL(host.dataset.index, location.href).href.replace(
          /static\/contentIndex\.json$/,
          "",
        )
        const category = (slug, note) =>
          note.tags?.some((t) => /^project$/i.test(t))
            ? "Projects"
            : note.tags?.some((t) => /^(skill|skills)$/i.test(t))
              ? "Skills"
              : note.tags?.some((t) => /^(achievement|achievements)$/i.test(t))
                ? "Achievements"
                : /\/projects\//i.test(slug) || note.tags?.includes("project")
                  ? "Projects"
                  : /\/skills?\//i.test(slug)
                    ? "Skills"
                    : /\/achievements?\//i.test(slug)
                      ? "Achievements"
                      : "Knowledge"
        const colors = {
          Projects: "#8aa9ff",
          Skills: "#ae8aff",
          Achievements: "#f3c478",
          Knowledge: "#60caba",
        }
        const nodes = Object.entries(index)
          .filter(([slug]) => slug.startsWith("brain/") && !slug.endsWith("/index"))
          .map(([slug, note]) => ({ slug, ...note, category: category(slug, note) }))
        let view = [0, 0, 1000, 500]
        const applyView = () => svg.setAttribute("viewBox", view.join(" "))
        const ns = "http://www.w3.org/2000/svg"
        const el = (tag, attrs, parent) => {
          const e = document.createElementNS(ns, tag)
          for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
          parent.append(e)
          return e
        }
        const render = () => {
          svg.replaceChildren()
          list.replaceChildren()
          const query = host.querySelector("input").value.toLowerCase(),
            filter = host.querySelector("select").value
          const visible = nodes.filter(
            (n) =>
              (!filter || n.category === filter) &&
              `${n.title} ${n.slug}`.toLowerCase().includes(query),
          )
          visible.forEach((n, i) => {
            const angle = (i / Math.max(visible.length, 1)) * Math.PI * 2 - Math.PI / 2
            n.x = visible.length === 1 ? 500 : 500 + Math.cos(angle) * 310
            n.y = visible.length === 1 ? 250 : 250 + Math.sin(angle) * 165
          })
          const edges = new Set()
          visible.forEach((n) =>
            (n.links ?? []).forEach((slug) => {
              const other = visible.find((o) => o.slug === slug)
              if (!other || other === n) return
              const key = [n.slug, other.slug].sort().join("|")
              if (edges.has(key)) return
              edges.add(key)
              el(
                "line",
                {
                  x1: n.x,
                  y1: n.y,
                  x2: other.x,
                  y2: other.y,
                  stroke: "#465775",
                  "stroke-width": 1.5,
                },
                svg,
              )
            }),
          )
          visible.forEach((n) => {
            const url = new URL(n.slug.split("/").map(encodeURIComponent).join("/"), base).href
            const a = el("a", { href: url, "aria-label": n.title }, svg)
            el("title", {}, a).textContent = `${n.title} · ${n.category}`
            el("circle", { cx: n.x, cy: n.y, r: 10, fill: colors[n.category] }, a)
            el("text", { x: n.x, y: n.y + 32, "text-anchor": "middle" }, a).textContent = n.title
            const li = document.createElement("li"),
              link = document.createElement("a")
            link.href = url
            link.textContent = n.title
            li.append(link)
            list.append(li)
          })
          if (!visible.length)
            el("text", { x: 500, y: 250, "text-anchor": "middle" }, svg).textContent =
              "No matching public notes"
        }
        host.querySelector("input").addEventListener("input", render)
        host.querySelector("select").addEventListener("change", render)
        host.querySelector("button").addEventListener("click", () => {
          view = [0, 0, 1000, 500]
          applyView()
          host.querySelector("input").value = ""
          host.querySelector("select").value = ""
          render()
        })
        svg.addEventListener(
          "wheel",
          (e) => {
            e.preventDefault()
            const ratio = e.deltaY > 0 ? 1.12 : 0.89
            if (view[2] * ratio < 250 || view[2] * ratio > 4000) return
            view = [
              view[0] + (view[2] * (1 - ratio)) / 2,
              view[1] + (view[3] * (1 - ratio)) / 2,
              view[2] * ratio,
              view[3] * ratio,
            ]
            applyView()
          },
          { passive: false },
        )
        let drag
        svg.addEventListener("pointerdown", (e) => {
          if (e.target.closest("a")) return
          drag = { x: e.clientX, y: e.clientY, view: [...view] }
          svg.setPointerCapture(e.pointerId)
        })
        svg.addEventListener("pointermove", (e) => {
          if (!drag) return
          const r = svg.getBoundingClientRect()
          view = [
            drag.view[0] - ((e.clientX - drag.x) * drag.view[2]) / r.width,
            drag.view[1] - ((e.clientY - drag.y) * drag.view[3]) / r.height,
            view[2],
            view[3],
          ]
          applyView()
        })
        svg.addEventListener("pointerup", () => (drag = null))
        svg.addEventListener("pointercancel", () => (drag = null))
        render()
      } catch {
        host.querySelector(".graph-hint").textContent =
          "Graph unavailable. Browse public projects from the homepage."
      }
    }
  }
  document.addEventListener("nav", init)
  init()
}
