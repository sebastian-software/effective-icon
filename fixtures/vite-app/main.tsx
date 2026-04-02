/** @jsx h */
/** @jsxFrag Fragment */

import { Fragment, h } from "./h"
import { renderFixtureApp } from "@fixture/app"

const app = document.querySelector<HTMLDivElement>("#app")

if (!app) {
  throw new Error("Missing #app root element")
}

const surface = import.meta.env.VITE_STREAMLINE_SURFACE ?? "jsx"
const renderMode = import.meta.env.VITE_STREAMLINE_RENDER_MODE ?? "image"

app.innerHTML = (
  renderFixtureApp({ renderMode, surface })
)
