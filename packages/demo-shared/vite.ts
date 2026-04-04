import path from "node:path"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import type { UserConfig } from "vite"

import { effectiveIconVitePlugin } from "../../src/plugin"
import type { EffectiveIconVitePluginOptions } from "../../src/types"
import { demoRouteByKey, demoRoutes, type DemoKey } from "./src/catalog"

interface CreateDemoConfigOptions {
  appRoot: string
  isDevServer: boolean
  outDir: string
  port: number
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

export function createDemoLinks(isDevServer: boolean): Record<DemoKey, string> {
  return Object.fromEntries(
    demoRoutes.map((route) => [route.key, isDevServer ? `http://127.0.0.1:${route.port}/` : `../${route.slug}/`])
  ) as Record<DemoKey, string>
}

export function createFrameworkDemoConfig(options: CreateDemoConfigOptions & { demo: DemoKey }): UserConfig {
  return {
    ...createBaseDemoConfig(options),
    plugins: [effectiveIconVitePlugin(resolvePluginOptions(options.demo))],
  }
}

function createBaseDemoConfig({ appRoot, isDevServer, outDir, port }: CreateDemoConfigOptions): UserConfig {
  return {
    root: appRoot,
    base: "./",
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
      __STREAMLINE_DEMO_LINKS__: JSON.stringify(createDemoLinks(isDevServer)),
      __STREAMLINE_DEMO_PACK_INFO__: JSON.stringify(demoPackInfo),
    },
    resolve: {
      alias: [
        { find: /^@streamline-demo\/shared$/, replacement: path.join(sharedRoot, "src/index.ts") },
        { find: /^@streamline-demo\/shared\/react-app$/, replacement: path.join(sharedRoot, "src/react-app.tsx") },
        { find: /^@streamline-demo\/shared\/solid-app$/, replacement: path.join(sharedRoot, "src/solid-app.tsx") },
        { find: /^@streamline-demo\/shared\/styles\.css$/, replacement: path.join(sharedRoot, "src/styles.css") },
        { find: /^@effective\/icon$/, replacement: path.join(repoRoot, "src/index.ts") },
        { find: /^@effective\/icon\/vite-plugin$/, replacement: path.join(repoRoot, "src/plugin.ts") },
        { find: /^@effective\/icon\/compile$/, replacement: path.join(repoRoot, "src/compile.ts") },
        { find: /^@effective\/icon\/runtime$/, replacement: path.join(repoRoot, "src/runtime.ts") },
      ],
    },
  }
}

function resolvePluginOptions(key: DemoKey): EffectiveIconVitePluginOptions {
  const route = demoRouteByKey[key]

  return {
    package: "@icon-pkg/streamline-core-line-free",
    surface: route.surface,
    renderMode: route.renderMode,
    typesOutputFile: false,
  }
}
