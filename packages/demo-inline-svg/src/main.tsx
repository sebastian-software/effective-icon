import "@streamline-demo/shared/styles.css"

import { mountDemoPage } from "@streamline-demo/shared"

const app = document.querySelector<HTMLDivElement>("#app")

if (!app) {
  throw new Error("Missing #app root element")
}

mountDemoPage(app, "svg")
