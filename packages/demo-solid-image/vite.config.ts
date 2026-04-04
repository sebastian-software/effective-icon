import path from "node:path"
import { fileURLToPath } from "node:url"

import { defineConfig } from "vite"
import solid from "vite-plugin-solid"

import { createFrameworkDemoConfig } from "../demo-shared/vite"

const appRoot = fileURLToPath(new URL(".", import.meta.url))
const repoRoot = path.resolve(appRoot, "../..")

export default defineConfig(({ command }) => {
  const base = createFrameworkDemoConfig({
    appRoot,
    isDevServer: command === "serve",
    outDir: path.join(repoRoot, "demo", "dist", "solid-image"),
    port: 4177,
    demo: "solid-image",
  })

  return {
    ...base,
    plugins: [...(base.plugins ?? []), solid()],
  }
})
