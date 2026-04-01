import path from "node:path"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import type { UserConfig } from "vite"

import { streamlineIcons } from "../../src"
import type { StreamlineIconsOptions } from "../../src/types"

type DemoVariant = "image" | "mask" | "inline-svg" | "web-component"

interface CreateDemoConfigOptions {
  appRoot: string
  isDevServer: boolean
  outDir: string
  port: number
  variant: DemoVariant
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..")
const sharedRoot = path.resolve(repoRoot, "packages", "demo-shared")
const packManifest = JSON.parse(
  readFileSync(path.join(repoRoot, "packages", "packs", "core-line-free", "manifest.json"), "utf8")
) as {
  family: string
  iconCount: number
  license: string
  name: string
  sourceUrl: string
  style: string
  version: string
}

const demoPackInfo = {
  family: packManifest.family,
  iconCount: packManifest.iconCount,
  license: packManifest.license,
  packageName: packManifest.name,
  sourceUrl: packManifest.sourceUrl,
  style: packManifest.style,
  version: packManifest.version,
} as const

function resolvePluginOptions(variant: DemoVariant): StreamlineIconsOptions {
  switch (variant) {
    case "mask":
      return {
        package: "@streamline-pkg/core-line-free",
        renderMode: "mask",
        target: "jsx",
      }
    case "inline-svg":
      return {
        package: "@streamline-pkg/core-line-free",
        renderMode: "inline-svg",
        target: "jsx",
      }
    case "web-component":
      return {
        package: "@streamline-pkg/core-line-free",
        target: "web-component",
      }
    case "image":
    default:
      return {
        package: "@streamline-pkg/core-line-free",
        renderMode: "image",
        target: "jsx",
      }
  }
}

export function createDemoConfig({ appRoot, isDevServer, outDir, port, variant }: CreateDemoConfigOptions): UserConfig {
  const links = isDevServer
    ? {
        image: "http://127.0.0.1:4174/",
        mask: "http://127.0.0.1:4175/",
        "inline-svg": "http://127.0.0.1:4176/",
        "web-component": "http://127.0.0.1:4177/",
      }
    : {
        image: "../image/",
        mask: "../mask/",
        "inline-svg": "../inline-svg/",
        "web-component": "../web-component/",
      }

  return {
    root: appRoot,
    base: "./",
    esbuild: {
      jsx: "transform",
      jsxFactory: "h",
      jsxFragment: "Fragment",
    },
    server: {
      host: "127.0.0.1",
      port,
      strictPort: true,
    },
    build: {
      assetsInlineLimit: 0,
      outDir,
      emptyOutDir: true,
    },
    define: {
      __STREAMLINE_DEMO_LINKS__: JSON.stringify(links),
      __STREAMLINE_DEMO_PACK_INFO__: JSON.stringify(demoPackInfo),
    },
    resolve: {
      alias: [
        { find: /^@streamline-demo\/shared$/, replacement: path.join(sharedRoot, "src/index.ts") },
        { find: /^@streamline-demo\/shared\/styles\.css$/, replacement: path.join(sharedRoot, "src/styles.css") },
        { find: /^vite-plugin-streamline$/, replacement: path.join(repoRoot, "src/index.ts") },
        { find: /^vite-plugin-streamline\/compile$/, replacement: path.join(repoRoot, "src/compile.ts") },
        { find: /^vite-plugin-streamline\/runtime$/, replacement: path.join(repoRoot, "src/runtime.ts") },
      ],
    },
    plugins: [streamlineIcons(resolvePluginOptions(variant))],
  }
}
