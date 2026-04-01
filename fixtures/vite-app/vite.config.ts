import path from "node:path"
import { fileURLToPath } from "node:url"

import { defineConfig } from "vite"

import { effectiveIconVitePlugin } from "../../src/plugin"

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
      { find: /^@effective\/icon$/, replacement: path.join(repoRoot, "src/index.ts") },
      { find: /^@effective\/icon\/vite-plugin$/, replacement: path.join(repoRoot, "src/plugin.ts") },
      { find: /^@effective\/icon\/compile$/, replacement: path.join(repoRoot, "src/compile.ts") },
      { find: /^@effective\/icon\/runtime$/, replacement: path.join(repoRoot, "src/runtime.ts") },
    ],
  },
  plugins: [
    effectiveIconVitePlugin(
      process.env.STREAMLINE_TARGET === "web-component"
        ? {
            package: "@icon-pkg/streamline-core-line-free",
            target: "web-component",
            typesOutputFile: false,
          }
        : {
            package: "@icon-pkg/streamline-core-line-free",
            target: "jsx",
            renderMode:
              process.env.STREAMLINE_RENDER_MODE === "mask"
                ? "mask"
                : process.env.STREAMLINE_RENDER_MODE === "inline-svg"
                  ? "inline-svg"
                  : "image",
            typesOutputFile: false,
          }
    ),
  ],
})
