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
      {
        find: /^@fixture\/app$/,
        replacement:
          process.env.STREAMLINE_SURFACE === "custom-element"
            ? path.join(fixtureRoot, "main-web-component.tsx")
            : path.join(fixtureRoot, "main-jsx.tsx"),
      },
      { find: /^@effective\/icon$/, replacement: path.join(repoRoot, "src/index.ts") },
      { find: /^@effective\/icon\/vite-plugin$/, replacement: path.join(repoRoot, "src/plugin.ts") },
      { find: /^@effective\/icon\/compile$/, replacement: path.join(repoRoot, "src/compile.ts") },
      { find: /^@effective\/icon\/runtime$/, replacement: path.join(repoRoot, "src/runtime.ts") },
    ],
  },
  plugins: [
    effectiveIconVitePlugin(
      process.env.STREAMLINE_SURFACE === "custom-element"
        ? {
            package: "@icon-pkg/streamline-core-line-free",
            surface: "custom-element",
            typesOutputFile: false,
          }
        : {
            package: "@icon-pkg/streamline-core-line-free",
            surface: "jsx",
            renderMode:
              process.env.STREAMLINE_RENDER_MODE === "mask"
                ? "mask"
                : process.env.STREAMLINE_RENDER_MODE === "svg"
                  ? "svg"
                  : "image",
            typesOutputFile: false,
          }
    ),
  ],
})
