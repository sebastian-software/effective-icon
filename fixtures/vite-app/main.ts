import { hasIcon, listIcons, loadIcon, selectedStyle } from "virtual:streamline-icons/loader"

async function render() {
  const app = document.querySelector<HTMLDivElement>("#app")

  if (!app) {
    throw new Error("Missing #app root element")
  }

  const rocket = await loadIcon("rocket")

  app.innerHTML = `
    <section data-selected-style="${selectedStyle}">
      <h1>Streamline Fixture</h1>
      <p id="style">${selectedStyle}</p>
      <p id="icons">${listIcons().join(",")}</p>
      <p id="has-rocket">${String(hasIcon("rocket"))}</p>
      <div id="icon">${rocket?.svg ?? ""}</div>
    </section>
  `
}

void render()
