import path from "node:path"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"

import { afterEach, describe, expect, it } from "vitest"
import type { Plugin, ResolvedConfig } from "vite"

import { MASK_CSS_MODULE_ID, effectiveIconVitePlugin } from "../src/plugin"

const repoRoot = path.resolve(process.cwd())
const packageName = "@icon-pkg/streamline-core-line-free"
const tempRoots: string[] = []
type TransformResult = string | { code: string; map: null } | null | undefined

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })))
})

describe("effectiveIconVitePlugin", () => {
  it("requires a package option and rejects unsupported surfaces", () => {
    expect(() => effectiveIconVitePlugin({ package: "" })).toThrow(/requires a "package" option/)
    expect(() =>
      effectiveIconVitePlugin({
        package: packageName,
        surface: "custom-element" as unknown as "jsx",
      } as Parameters<typeof effectiveIconVitePlugin>[0])
    ).toThrow(/no longer supports surface "custom-element"/)
  })

  it("resolves and loads the virtual mask css module", () => {
    const plugin = effectiveIconVitePlugin({
      package: packageName,
      renderMode: "mask",
      typesOutputFile: false,
    })
    const resolveId = getHookHandler<(id: string) => string | null>(plugin.resolveId)
    const load = getHookHandler<(id: string) => string | null>(plugin.load)

    expect(resolveId?.(MASK_CSS_MODULE_ID)).toBe("\0virtual:effective-icon/mask.css")

    const css = load?.("\0virtual:effective-icon/mask.css")
    expect(css).toContain("@layer effective-icon")
    expect(css).toContain(".effective-icon-mask")
    expect(css).toContain("--effective-icon-mask-image")
    expect(resolveId?.("virtual:effective-icon/other.css")).toBeNull()
    expect(load?.("\0virtual:effective-icon/other.css")).toBeNull()
  })

  it("returns null for files inside node_modules", async () => {
    const plugin = effectiveIconVitePlugin({
      package: packageName,
      renderMode: "image",
      typesOutputFile: false,
    })
    const configResolved = getHookHandler<(config: ResolvedConfig) => Promise<void>>(plugin.configResolved)
    const transform = getHookHandler<(code: string, id: string) => Promise<TransformResult>>(plugin.transform)

    await configResolved?.(createResolvedConfig(repoRoot))

    await expect(
      transform?.(
        'import { Icon } from "@effective/icon/compile"; const view = <Icon name="airplane" />',
        "/virtual/node_modules/example/index.tsx"
      )
    ).resolves.toBeNull()
  })

  it("normalizes component mode to image mode for regular JSX consumers", async () => {
    const plugin = effectiveIconVitePlugin({
      package: packageName,
      renderMode: "component",
      typesOutputFile: false,
    })
    const configResolved = getHookHandler<(config: ResolvedConfig) => Promise<void>>(plugin.configResolved)
    const transform = getHookHandler<(code: string, id: string) => Promise<unknown>>(plugin.transform)

    await configResolved?.(createResolvedConfig(repoRoot, [{ name: "vite:react" }]))

    const result = (await transform?.(
      'import { Icon } from "@effective/icon/compile"; const view = <Icon name="airplane" className="icon" />',
      "/virtual/input.tsx"
    )) as TransformResult

    expect(extractTransformCode(result)).toContain("<img")
    expect(extractTransformCode(result)).toContain("?url")
  })

  it("uses object-style helpers for non-solid dynamic mask transforms", async () => {
    const plugin = effectiveIconVitePlugin({
      package: packageName,
      renderMode: "mask",
      typesOutputFile: false,
    })
    const configResolved = getHookHandler<(config: ResolvedConfig) => Promise<void>>(plugin.configResolved)
    const transform = getHookHandler<(code: string, id: string) => Promise<TransformResult>>(plugin.transform)

    await configResolved?.(createResolvedConfig(repoRoot, [{ name: "vite:react" }]))

    const result = (await transform?.(
      `import { Icon } from "@effective/icon/compile"
const iconStyle = getIconStyle()
const view = <Icon name="airplane" style={iconStyle} />`,
      "/virtual/input.tsx"
    )) as TransformResult
    const code = extractTransformCode(result)

    expect(code).toContain('import "virtual:effective-icon/mask.css"')
    expect(code).toContain("buildIconMaskStyle")
    expect(code).not.toContain("buildIconMaskStyleString")
  })

  it("uses string-style helpers when a solid plugin is active", async () => {
    const plugin = effectiveIconVitePlugin({
      package: packageName,
      renderMode: "mask",
      typesOutputFile: false,
    })
    const configResolved = getHookHandler<(config: ResolvedConfig) => Promise<void>>(plugin.configResolved)
    const transform = getHookHandler<(code: string, id: string) => Promise<TransformResult>>(plugin.transform)

    await configResolved?.(createResolvedConfig(repoRoot, [{ name: "vite-plugin-solid" }]))

    const result = (await transform?.(
      `import { Icon } from "@effective/icon/compile"
const iconStyle = getIconStyle()
const view = <Icon name="airplane" style={iconStyle} />`,
      "/virtual/input.tsx"
    )) as TransformResult
    const code = extractTransformCode(result)

    expect(code).toContain("buildIconMaskStyleString")
    expect(code).not.toContain("buildIconMaskStyle,")
  })

  it("returns null when a file contains no compile-time icon usage", async () => {
    const plugin = effectiveIconVitePlugin({
      package: packageName,
      renderMode: "mask",
      typesOutputFile: false,
    })
    const configResolved = getHookHandler<(config: ResolvedConfig) => Promise<void>>(plugin.configResolved)
    const transform = getHookHandler<(code: string, id: string) => Promise<TransformResult>>(plugin.transform)

    await configResolved?.(createResolvedConfig(repoRoot))

    await expect(transform?.("export const view = 1", "/virtual/input.ts")).resolves.toBeNull()
  })

  it("defaults to image mode and supports explicit svg mode", async () => {
    const imagePlugin = effectiveIconVitePlugin({
      package: packageName,
      typesOutputFile: false,
    })
    const svgPlugin = effectiveIconVitePlugin({
      package: packageName,
      renderMode: "svg",
      typesOutputFile: false,
    })
    const imageConfigResolved = getHookHandler<(config: ResolvedConfig) => Promise<void>>(imagePlugin.configResolved)
    const svgConfigResolved = getHookHandler<(config: ResolvedConfig) => Promise<void>>(svgPlugin.configResolved)
    const imageTransform = getHookHandler<(code: string, id: string) => Promise<TransformResult>>(imagePlugin.transform)
    const svgTransform = getHookHandler<(code: string, id: string) => Promise<TransformResult>>(svgPlugin.transform)

    await imageConfigResolved?.(createResolvedConfig(repoRoot))
    await svgConfigResolved?.(createResolvedConfig(repoRoot))

    const imageResult = (await imageTransform?.(
      'import { Icon } from "@effective/icon/compile"; const view = <Icon name="airplane" />',
      "/virtual/input.tsx"
    )) as TransformResult
    const svgResult = (await svgTransform?.(
      'import { Icon } from "@effective/icon/compile"; const view = <Icon name="airplane" />',
      "/virtual/input.tsx"
    )) as TransformResult

    expect(extractTransformCode(imageResult)).toContain("<img")
    expect(extractTransformCode(svgResult)).toContain("<svg")
  })

  it("writes the generated type file during startup", async () => {
    const root = await createTempRoot("effective-icon-plugin-")
    const outputFile = "types/effective-icon.generated.d.ts"
    const plugin = effectiveIconVitePlugin({
      package: packageName,
      renderMode: "image",
      typesOutputFile: outputFile,
    })
    const configResolved = getHookHandler<(config: ResolvedConfig) => Promise<void>>(plugin.configResolved)
    const buildStart = getHookHandler<(this: unknown) => Promise<void>>(plugin.buildStart)

    await writeFile(path.join(root, "package.json"), '{"name":"effective-icon-plugin-test"}\n', "utf8")

    await configResolved?.(createResolvedConfig(root))
    await buildStart?.call(createPluginContext())

    const generatedPath = path.join(root, outputFile)
    const generated = await readFile(generatedPath, "utf8")

    expect(generated).toContain('import "@effective/icon/compile"')
    expect(generated).toContain('| "airplane"')
  })
})

function createResolvedConfig(root: string, plugins: Plugin[] = []): ResolvedConfig {
  return {
    root,
    plugins,
  } as unknown as ResolvedConfig
}

function createPluginContext() {
  return {
    addWatchFile() {},
    emitFile() {
      return ""
    },
    error(error: unknown): never {
      throw error instanceof Error ? error : new Error(String(error))
    },
    warn() {},
  }
}

function extractTransformCode(result: TransformResult): string {
  if (!result) {
    return ""
  }

  return typeof result === "string" ? result : result.code
}

async function createTempRoot(prefix: string): Promise<string> {
  const root = await mkdtemp(path.join(repoRoot, `${prefix}`))
  tempRoots.push(root)
  return root
}

function getHookHandler<T extends (...args: never[]) => unknown>(hook: unknown): T | undefined {
  if (typeof hook === "function") {
    return hook as T
  }

  if (hook && typeof hook === "object") {
    const hookObject = hook as Record<string, unknown>
    const handler = hookObject.handler
    if (typeof handler === "function") {
      return handler as T
    }
  }

  return undefined
}
