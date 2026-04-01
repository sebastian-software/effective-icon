import type { Plugin, ResolvedConfig } from "vite"

import { resolveIconPackage, type ResolvedIconPackage } from "./resolve-package"
import { transformCompileTimeIcons } from "./transform"
import type { StreamlineIconsOptions } from "./types"

interface PluginState {
  config?: ResolvedConfig
  resolvedPackage?: ResolvedIconPackage
  promise?: Promise<ResolvedIconPackage>
}

export function streamlineIcons(options: StreamlineIconsOptions): Plugin {
  if (!options?.package) {
    throw new Error('streamlineIcons() requires a "package" option')
  }

  const normalizedOptions = {
    package: options.package,
    target: options.target ?? "jsx",
    renderMode: normalizeRenderMode(options.renderMode),
  } as const

  if (normalizedOptions.target === "web-component" && options.renderMode) {
    throw new Error('renderMode is only supported when target is "jsx"')
  }

  const state: PluginState = {}

  return {
    name: "vite-plugin-streamline",
    enforce: "pre",
    configResolved(config) {
      state.config = config
    },
    async buildStart() {
      await ensurePackage(state, normalizedOptions.package)
    },
    async transform(code, id) {
      if (id.includes("/node_modules/")) {
        return null
      }

      const resolvedPackage = await ensurePackage(state, normalizedOptions.package)
      const transformed = transformCompileTimeIcons(code, id, {
        options: normalizedOptions,
        resolvedPackage,
      })

      if (!transformed) {
        return null
      }

      return {
        code: transformed,
        map: null,
      }
    },
  }
}

function normalizeRenderMode(renderMode: StreamlineIconsOptions["renderMode"] | undefined): "image" | "mask" | "inline-svg" {
  if (renderMode === "component" || renderMode == null) {
    return "image"
  }

  return renderMode
}

async function ensurePackage(state: PluginState, packageName: string): Promise<ResolvedIconPackage> {
  if (state.resolvedPackage) {
    return state.resolvedPackage
  }

  if (!state.promise) {
    const root = state.config?.root ?? process.cwd()
    state.promise = resolveIconPackage(packageName, root)
  }

  state.resolvedPackage = await state.promise
  return state.resolvedPackage
}
