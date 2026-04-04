import { createRoot } from "react-dom/client"

import "@streamline-demo/shared/styles.css"

import { ReactDemoApp } from "@streamline-demo/shared/react-app"

const app = document.querySelector<HTMLDivElement>("#app")

if (!app) {
  throw new Error("Missing #app root element")
}

createRoot(app).render(<ReactDemoApp demo="react-svg" />)
