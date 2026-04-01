/** @jsx h */
/** @jsxFrag Fragment */

import { Fragment, h } from "./h"

import { Icon, icon } from "vite-plugin-streamline/compile"

const app = document.querySelector<HTMLDivElement>("#app")

if (!app) {
  throw new Error("Missing #app root element")
}

const target = import.meta.env.VITE_STREAMLINE_TARGET ?? "jsx"
const renderMode = import.meta.env.VITE_STREAMLINE_RENDER_MODE ?? "component"

app.innerHTML = (
  <section data-target={target} data-render-mode={renderMode}>
    <h1>Compile-Time Streamline Fixture</h1>
    <div className="icon-grid">
      <Icon name="rocket" className="icon icon--rocket" aria-label="Rocket" />
      {icon`search`}
    </div>
  </section>
)
