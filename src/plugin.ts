import type { Plugin, ResolvedConfig } from "vite"

import { resolveIconPackage, type ResolvedIconPackage } from "./resolve-package"
import { syncIconkitTypeFile } from "./typegen"
import { transformCompileTimeIcons } from "./transform"
import type { IconkitVitePluginOptions } from "./types"

interface PluginState {
  config?: ResolvedConfig
  resolvedPackage?: ResolvedIconPackage
  promise?: Promise<ResolvedIconPackage>
  typegenPromise?: Promise<void>
}

export function iconkitVitePlugin(options: IconkitVitePluginOptions): Plugin {
  if (!options?.package) {
    throw new Error('iconkitVitePlugin() requires a "package" option')
  }

  const normalizedOptions = {
    package: options.package,
    target: options.target ?? "jsx",
    renderMode: normalizeRenderMode(options.renderMode),
    typesOutputFile: options.typesOutputFile,
  } as const

  if (normalizedOptions.target === "web-component" && options.renderMode) {
    throw new Error('renderMode is only supported when target is "jsx"')
  }

  const state: PluginState = {}

  return {
    name: "iconkit-vite-plugin",
    enforce: "pre",
    async configResolved(config) {
      state.config = config
      await ensureTypegen(state, normalizedOptions)
    },
    async buildStart() {
      await ensureTypegen(state, normalizedOptions)
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

function normalizeRenderMode(renderMode: IconkitVitePluginOptions["renderMode"] | undefined): "image" | "mask" | "inline-svg" {
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

async function ensureTypegen(
  state: PluginState,
  options: Pick<IconkitVitePluginOptions, "package" | "typesOutputFile">
): Promise<void> {
  if (!state.typegenPromise) {
    state.typegenPromise = (async () => {
      const resolvedPackage = await ensurePackage(state, options.package)
      const root = state.config?.root ?? process.cwd()
      await syncIconkitTypeFile({
        outputFile: options.typesOutputFile,
        resolvedPackage,
        root,
      })
    })()
  }

  await state.typegenPromise
}
