import path from "node:path"
import { fileURLToPath } from "node:url"

import { defineConfig } from "vite"
import solid from "vite-plugin-solid"

import { effectiveIconVitePlugin } from "../../src/plugin"

const appRoot = fileURLToPath(new URL(".", import.meta.url))
const repoRoot = path.resolve(appRoot, "../..")

export default defineConfig({
  root: appRoot,
  base: "./",
  server: {
    host: "127.0.0.1",
    port: 4178,
    strictPort: true,
  },
  build: {
    assetsInlineLimit: 0,
    outDir: path.join(repoRoot, "demo", "dist", "solid"),
    emptyOutDir: true,
  },
  resolve: {
    alias: [
      { find: /^@effective\/icon$/, replacement: path.join(repoRoot, "src/index.ts") },
      { find: /^@effective\/icon\/vite-plugin$/, replacement: path.join(repoRoot, "src/plugin.ts") },
      { find: /^@effective\/icon\/compile$/, replacement: path.join(repoRoot, "src/compile.ts") },
      { find: /^@effective\/icon\/runtime$/, replacement: path.join(repoRoot, "src/runtime.ts") },
    ],
  },
  plugins: [
    effectiveIconVitePlugin({
      package: "@icon-pkg/streamline-core-line-free",
      surface: "jsx",
      renderMode: "svg",
      typesOutputFile: false,
    }),
    solid(),
  ],
})
