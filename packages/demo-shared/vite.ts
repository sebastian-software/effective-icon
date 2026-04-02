import path from "node:path"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import type { UserConfig } from "vite"

import { effectiveIconVitePlugin } from "../../src/plugin"
import type { EffectiveIconVitePluginOptions } from "../../src/types"

type DemoVariant = "image" | "mask" | "svg" | "custom-element"

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

function resolvePluginOptions(variant: DemoVariant): EffectiveIconVitePluginOptions {
  switch (variant) {
    case "mask":
      return {
        package: "@icon-pkg/streamline-core-line-free",
        renderMode: "mask",
        surface: "jsx",
        typesOutputFile: false,
      }
    case "svg":
      return {
        package: "@icon-pkg/streamline-core-line-free",
        renderMode: "svg",
        surface: "jsx",
        typesOutputFile: false,
      }
    case "custom-element":
      return {
        package: "@icon-pkg/streamline-core-line-free",
        surface: "custom-element",
        typesOutputFile: false,
      }
    case "image":
    default:
      return {
        package: "@icon-pkg/streamline-core-line-free",
        renderMode: "image",
        surface: "jsx",
        typesOutputFile: false,
      }
  }
}

export function createDemoConfig({ appRoot, isDevServer, outDir, port, variant }: CreateDemoConfigOptions): UserConfig {
  const links = isDevServer
    ? {
        image: "http://127.0.0.1:4174/",
        mask: "http://127.0.0.1:4175/",
        svg: "http://127.0.0.1:4176/",
        "custom-element": "http://127.0.0.1:4177/",
      }
    : {
        image: "../image/",
        mask: "../mask/",
        svg: "../inline-svg/",
        "custom-element": "../web-component/",
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
        { find: /^@streamline-demo\/shared\/web-component$/, replacement: path.join(sharedRoot, "src/mount-web-component.ts") },
        { find: /^@streamline-demo\/shared\/styles\.css$/, replacement: path.join(sharedRoot, "src/styles.css") },
        { find: /^@effective\/icon$/, replacement: path.join(repoRoot, "src/index.ts") },
        { find: /^@effective\/icon\/vite-plugin$/, replacement: path.join(repoRoot, "src/plugin.ts") },
        { find: /^@effective\/icon\/compile$/, replacement: path.join(repoRoot, "src/compile.ts") },
        { find: /^@effective\/icon\/runtime$/, replacement: path.join(repoRoot, "src/runtime.ts") },
      ],
    },
    plugins: [effectiveIconVitePlugin(resolvePluginOptions(variant))],
  }
}
