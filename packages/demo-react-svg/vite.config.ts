import path from "node:path"
import { fileURLToPath } from "node:url"

import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

import { createFrameworkDemoConfig } from "../demo-shared/vite"

const appRoot = fileURLToPath(new URL(".", import.meta.url))
const repoRoot = path.resolve(appRoot, "../..")

export default defineConfig(({ command }) => {
  const base = createFrameworkDemoConfig({
    appRoot,
    isDevServer: command === "serve",
    outDir: path.join(repoRoot, "demo", "dist", "react-svg"),
    port: 4176,
    demo: "react-svg",
  })

  return {
    ...base,
    plugins: [...(base.plugins ?? []), react()],
  }
})
