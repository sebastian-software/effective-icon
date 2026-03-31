import "./styles.css"

import { listIcons, loadIcon, selectedStyle } from "virtual:streamline-icons/loader"

async function renderGallery() {
  const app = document.querySelector<HTMLDivElement>("#app")

  if (!app) {
    throw new Error("Missing #app root element")
  }

  const iconNames = listIcons()
  const icons = await Promise.all(
    iconNames.map(async (name) => ({
      name,
      icon: await loadIcon(name),
    }))
  )

  const cards = icons
    .map(({ name, icon }, index) => {
      const accent = index % 4
      return `
        <article class="icon-card icon-card--${accent}">
          <div class="icon-card__art" aria-hidden="true">${icon?.svg ?? ""}</div>
          <div class="icon-card__meta">
            <p class="icon-card__name">${name}</p>
            <p class="icon-card__style">${icon?.style ?? selectedStyle}</p>
          </div>
        </article>
      `
    })
    .join("")

  app.innerHTML = `
    <div class="shell">
      <header class="hero">
        <p class="hero__eyebrow">GitHub Pages Demo</p>
        <h1 class="hero__title">Lazy Streamline icons, rendered as a static gallery.</h1>
        <p class="hero__lede">
          This page is built from the same virtual loader contract as the plugin consumer tests. It shows every built-in icon
          currently bundled in the package.
        </p>
        <dl class="hero__facts" aria-label="Gallery facts">
          <div>
            <dt>Icons</dt>
            <dd>${iconNames.length}</dd>
          </div>
          <div>
            <dt>Style</dt>
            <dd>${selectedStyle}</dd>
          </div>
          <div>
            <dt>Loader</dt>
            <dd>virtual:streamline-icons/loader</dd>
          </div>
        </dl>
      </header>

      <section class="gallery" aria-label="Icon gallery">
        ${cards}
      </section>
    </div>
  `
}

void renderGallery()
