import path from "node:path"
import { fileURLToPath } from "node:url"

import { defineConfig } from "vite"

import { streamlineIcons } from "../src"

const demoRoot = fileURLToPath(new URL(".", import.meta.url))
const repoRoot = path.resolve(demoRoot, "..")
const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1]

export default defineConfig({
  root: demoRoot,
  base: process.env.GITHUB_ACTIONS === "true" && repositoryName ? `/${repositoryName}/` : "/",
  esbuild: {
    jsx: "transform",
    jsxFactory: "h",
    jsxFragment: "Fragment",
  },
  resolve: {
    alias: [
      { find: /^vite-plugin-streamline$/, replacement: path.join(repoRoot, "src/index.ts") },
      { find: /^vite-plugin-streamline\/compile$/, replacement: path.join(repoRoot, "src/compile.ts") },
      { find: /^vite-plugin-streamline\/runtime$/, replacement: path.join(repoRoot, "src/runtime.ts") },
    ],
  },
  plugins: [
    streamlineIcons({
      package: "@streamline-pkg/core-line-free",
      target: "jsx",
      renderMode: "component",
    }),
  ],
})
