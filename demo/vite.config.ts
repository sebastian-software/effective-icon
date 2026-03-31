import path from "node:path"
import { fileURLToPath } from "node:url"

import { defineConfig } from "vite"

import { streamlineIcons } from "../src"

const demoRoot = fileURLToPath(new URL(".", import.meta.url))
const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1]

export default defineConfig({
  root: demoRoot,
  base: process.env.GITHUB_ACTIONS === "true" && repositoryName ? `/${repositoryName}/` : "/",
  plugins: [
    streamlineIcons({
      style: "regular",
      source: { type: "free", assetsDir: path.resolve(demoRoot, "../assets/free") },
    }),
  ],
})
