// Enhance server-rendered cards; no extra index, private data, or dependencies.
if (!window.__projectsGallery) {
  window.__projectsGallery = true
  const init = () => {
    for (const gallery of document.querySelectorAll("[data-project-gallery]")) {
      if (gallery.dataset.ready) continue
      gallery.dataset.ready = "true"
      const controls = gallery.querySelector("[data-gallery-controls]")
      const search = gallery.querySelector("[data-gallery-search]")
      const category = gallery.querySelector("[data-gallery-category]")
      const cards = [...gallery.querySelectorAll("[data-gallery-card]")]
      const status = gallery.querySelector("[data-gallery-count]")
      const empty = gallery.querySelector("[data-gallery-empty]")
      const normalize = (text) => text.normalize("NFKC").toLocaleLowerCase("en").trim()
      const records = cards.map((card) => ({
        card,
        text: normalize(card.textContent),
        category: card.dataset.category,
      }))
      const update = () => {
        const terms = normalize(search.value).split(/\s+/).filter(Boolean)
        let visible = 0
        for (const record of records) {
          const matches =
            (!category.value || record.category === category.value) &&
            terms.every((term) => record.text.includes(term))
          record.card.hidden = !matches
          visible += Number(matches)
        }
        status.textContent = `${visible} ${visible === 1 ? "project" : "projects"}${visible === cards.length ? "" : ` of ${cards.length}`}`
        empty.hidden = visible !== 0
      }
      search.addEventListener("input", update)
      category.addEventListener("change", update)
      gallery.querySelector("[data-gallery-reset]").addEventListener("click", () => {
        search.value = ""
        category.value = ""
        update()
        search.focus()
      })
      controls.hidden = false
      update()
    }
  }
  document.addEventListener("nav", init)
  init()
}
