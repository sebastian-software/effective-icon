/** @jsxImportSource solid-js */

import { render } from "solid-js/web"

import "./styles.css"

import { App } from "./App"

const app = document.querySelector<HTMLDivElement>("#app")

if (!app) {
  throw new Error("Missing #app root element")
}

render(() => <App />, app)
