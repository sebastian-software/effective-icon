import path from "node:path"
import { fileURLToPath } from "node:url"

import { defineConfig } from "vite"

import { streamlineIcons } from "../../src"

const fixtureRoot = fileURLToPath(new URL(".", import.meta.url))
const repoRoot = path.resolve(fixtureRoot, "../..")

export default defineConfig({
  root: fixtureRoot,
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
    streamlineIcons(
      process.env.STREAMLINE_TARGET === "web-component"
        ? {
            package: "@streamline-pkg/core-line-free",
            target: "web-component",
          }
        : {
            package: "@streamline-pkg/core-line-free",
            target: "jsx",
            renderMode:
              process.env.STREAMLINE_RENDER_MODE === "mask"
                ? "mask"
                : process.env.STREAMLINE_RENDER_MODE === "inline-svg"
                  ? "inline-svg"
                  : "image",
          }
    ),
  ],
})
