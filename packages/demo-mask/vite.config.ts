import path from "node:path"
import { fileURLToPath } from "node:url"

import { defineConfig } from "vite"

import { createDemoConfig } from "../demo-shared/vite"

const appRoot = fileURLToPath(new URL(".", import.meta.url))
const repoRoot = path.resolve(appRoot, "../..")

export default defineConfig(({ command }) =>
  createDemoConfig({
    appRoot,
    isDevServer: command === "serve",
    outDir: path.join(repoRoot, "demo", "dist", "mask"),
    port: 4175,
    variant: "mask",
  })
)
