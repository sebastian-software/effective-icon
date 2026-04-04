import type { Plugin, ResolvedConfig } from "vite"

import { resolveIconPackage, type ResolvedIconPackage } from "./resolve-package"
import { EFFECTIVE_ICON_MASK_CLASS_NAME, EFFECTIVE_ICON_MASK_IMAGE_VAR_NAME } from "./runtime"
import { syncEffectiveIconTypeFile } from "./typegen"
import { transformCompileTimeIcons } from "./transform"
import type { EffectiveIconVitePluginOptions } from "./types"

export const MASK_CSS_MODULE_ID = "virtual:effective-icon/mask.css"
const RESOLVED_MASK_CSS_MODULE_ID = "\0virtual:effective-icon/mask.css"

interface PluginState {
  config?: ResolvedConfig
  resolvedPackage?: ResolvedIconPackage
  promise?: Promise<ResolvedIconPackage>
  typegenPromise?: Promise<void>
}

export function effectiveIconVitePlugin(options: EffectiveIconVitePluginOptions): Plugin {
  if (!options?.package) {
    throw new Error('effectiveIconVitePlugin() requires a "package" option')
  }

  const surface = options.surface ?? "jsx"
  if (surface !== "jsx") {
    throw new Error(`effectiveIconVitePlugin() no longer supports surface "${surface}"`)
  }

  const normalizedOptions = {
    package: options.package,
    surface,
    renderMode: normalizeRenderMode(options.renderMode, surface),
    styleTarget: "object" as const,
    typesOutputFile: options.typesOutputFile,
  } as const

  const state: PluginState = {}

  return {
    name: "effective-icon-vite-plugin",
    enforce: "pre",
    resolveId(id) {
      if (id === MASK_CSS_MODULE_ID) {
        return RESOLVED_MASK_CSS_MODULE_ID
      }

      return null
    },
    load(id) {
      if (id === RESOLVED_MASK_CSS_MODULE_ID) {
        return `@layer effective-icon {
  .${EFFECTIVE_ICON_MASK_CLASS_NAME} {
  display: inline-block;
  background-color: currentColor;
  -webkit-mask-image: var(${EFFECTIVE_ICON_MASK_IMAGE_VAR_NAME});
  mask-image: var(${EFFECTIVE_ICON_MASK_IMAGE_VAR_NAME});
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-size: contain;
  mask-size: contain;
  width: 1em;
  height: 1em;
  vertical-align: middle;
  }
}
`
      }

      return null
    },
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
        options: {
          ...normalizedOptions,
          styleTarget: resolveStyleTarget(state.config),
        },
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

function resolveStyleTarget(config: ResolvedConfig | undefined): "object" | "string" {
  const usesSolid = config?.plugins.some((plugin) => plugin.name.toLowerCase().includes("solid")) ?? false
  return usesSolid ? "string" : "object"
}

function normalizeRenderMode(
  renderMode: EffectiveIconVitePluginOptions["renderMode"] | undefined,
  _surface: EffectiveIconVitePluginOptions["surface"] | undefined
): "image" | "mask" | "svg" {
  if (renderMode === "component") {
    return "image"
  }

  if (renderMode == null) {
    return "image"
  }

  if (renderMode === "svg") {
    return "svg"
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
  options: Pick<EffectiveIconVitePluginOptions, "package" | "typesOutputFile">
): Promise<void> {
  if (!state.typegenPromise) {
    state.typegenPromise = (async () => {
      const resolvedPackage = await ensurePackage(state, options.package)
      const root = state.config?.root ?? process.cwd()
      await syncEffectiveIconTypeFile({
        outputFile: options.typesOutputFile,
        resolvedPackage,
        root,
      })
    })()
  }

  await state.typegenPromise
}
