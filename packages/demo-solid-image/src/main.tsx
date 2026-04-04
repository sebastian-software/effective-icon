/** @jsxImportSource solid-js */

import { render } from "solid-js/web"

import "@streamline-demo/shared/styles.css"

import { SolidDemoApp } from "@streamline-demo/shared/solid-app"

const app = document.querySelector<HTMLDivElement>("#app")

if (!app) {
  throw new Error("Missing #app root element")
}

render(() => <SolidDemoApp demo="solid-image" />, app)
