import "@streamline-demo/shared/styles.css"

import { mountWebComponentDemoPage } from "@streamline-demo/shared/web-component"

const app = document.querySelector<HTMLDivElement>("#app")

if (!app) {
  throw new Error("Missing #app root element")
}

mountWebComponentDemoPage(app)
