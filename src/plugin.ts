import type { Plugin, ResolvedConfig } from "vite"

import {
  buildLoaderModule,
  createVirtualIconRegistry,
  ICON_MODULE_PREFIX,
  loadIconModule,
  LOADER_MODULE_ID,
  RESOLVED_ICON_MODULE_PREFIX,
  RESOLVED_LOADER_MODULE_ID,
  type VirtualIconRegistry,
} from "./manifest"
import {
  resolveApiIconSet,
  resolveArchiveIconSet,
  resolveDirectoryIconSet,
  resolveFreeIconSet,
} from "./providers"
import type {
  ProviderContext,
  ResolvedIconSet,
  StreamlineIconsOptions,
  StreamlineIconStyle,
} from "./types"

interface PluginState {
  config?: ResolvedConfig
  registry?: VirtualIconRegistry
  promise?: Promise<VirtualIconRegistry>
}

export function streamlineIcons(options: StreamlineIconsOptions = {}): Plugin {
  const state: PluginState = {}

  return {
    name: "vite-plugin-streamline",
    enforce: "pre",
    configResolved(config) {
      state.config = config
    },
    async buildStart() {
      await ensureRegistry(state, options)
    },
    resolveId(id) {
      if (id === LOADER_MODULE_ID) {
        return RESOLVED_LOADER_MODULE_ID
      }
      if (id.startsWith(ICON_MODULE_PREFIX)) {
        return id.replace(ICON_MODULE_PREFIX, RESOLVED_ICON_MODULE_PREFIX)
      }
      return undefined
    },
    async load(id) {
      const registry = await ensureRegistry(state, options)

      if (id === RESOLVED_LOADER_MODULE_ID) {
        return buildLoaderModule(registry)
      }

      if (id.startsWith(RESOLVED_ICON_MODULE_PREFIX)) {
        const encodedName = id.slice(RESOLVED_ICON_MODULE_PREFIX.length)
        const name = decodeURIComponent(encodedName)
        const entry = registry.byName.get(name)
        if (!entry) {
          return "export default null"
        }
        return loadIconModule(entry)
      }

      return undefined
    },
  }
}

async function ensureRegistry(
  state: PluginState,
  options: StreamlineIconsOptions
): Promise<VirtualIconRegistry> {
  if (state.registry) {
    return state.registry
  }

  if (!state.promise) {
    state.promise = prepareRegistry(state, options)
  }

  state.registry = await state.promise
  return state.registry
}

async function prepareRegistry(
  state: PluginState,
  options: StreamlineIconsOptions
): Promise<VirtualIconRegistry> {
  const config = state.config
  const root = config?.root ?? process.cwd()
  const style = options.style ?? "regular"
  const source = options.source ?? { type: "free" as const }
  const iconSet = await resolveSourceIconSet(source, style, { root })
  return createVirtualIconRegistry(iconSet)
}

async function resolveSourceIconSet(
  source: StreamlineIconsOptions["source"],
  style: StreamlineIconStyle,
  context: ProviderContext
): Promise<ResolvedIconSet> {
  if (!source || source.type === "free") {
    return resolveFreeIconSet(source ?? { type: "free" }, style, context)
  }

  switch (source.type) {
    case "directory":
      return resolveDirectoryIconSet(source, style, context)
    case "archive":
      return resolveArchiveIconSet(source, style, context)
    case "api":
      return resolveApiIconSet(source, style, context)
  }
}
