import { readFile } from "node:fs/promises"
import path from "node:path"

import type { ResolvedIconSet, StreamlineIconAsset, StreamlineIconModule } from "./types"

export const LOADER_MODULE_ID = "virtual:streamline-icons/loader"
export const RESOLVED_LOADER_MODULE_ID = "\0virtual:streamline-icons/loader"
export const ICON_MODULE_PREFIX = "virtual:streamline-icons/icon/"
export const RESOLVED_ICON_MODULE_PREFIX = "\0virtual:streamline-icons/icon/"

export interface VirtualIconRegistryEntry {
  asset: StreamlineIconAsset
  virtualId: string
}

export interface VirtualIconRegistry {
  style: ResolvedIconSet["style"]
  byName: Map<string, VirtualIconRegistryEntry>
}

export function createVirtualIconRegistry(iconSet: ResolvedIconSet): VirtualIconRegistry {
  const byName = new Map<string, VirtualIconRegistryEntry>()

  for (const [name, asset] of iconSet.icons.entries()) {
    const virtualId = ICON_MODULE_PREFIX + encodeURIComponent(name)
    byName.set(name, { asset, virtualId })
  }

  return { style: iconSet.style, byName }
}

export function buildLoaderModule(registry: VirtualIconRegistry): string {
  const imports = [...registry.byName.entries()]
    .map(([name, entry]) => "  " + JSON.stringify(name) + ": () => import(" + JSON.stringify(entry.virtualId) + ")")
    .join(",\n")

  return [
    "const iconLoaders = {",
    imports,
    "}",
    "",
    "export const selectedStyle = " + JSON.stringify(registry.style),
    "",
    "export function listIcons() {",
    "  return Object.keys(iconLoaders).sort()",
    "}",
    "",
    "export function hasIcon(name) {",
    "  return Object.prototype.hasOwnProperty.call(iconLoaders, name)",
    "}",
    "",
    "export async function loadIcon(name) {",
    "  const loader = iconLoaders[name]",
    "  if (!loader) return null",
    "  const mod = await loader()",
    "  return mod.default",
    "}",
    "",
  ].join("\n")
}

export async function loadIconModule(entry: VirtualIconRegistryEntry): Promise<string> {
  const payload = await readIconPayload(entry.asset)
  return "export default " + JSON.stringify(payload)
}

export async function readIconPayload(asset: StreamlineIconAsset): Promise<StreamlineIconModule> {
  const svg = asset.svg ?? (await readFile(asset.path ?? "", "utf8"))
  return {
    name: asset.name,
    style: asset.style,
    svg,
  }
}

export function normalizeIconName(input: string): string {
  const fileName = input.replace(/\.svg$/i, "")
  return fileName
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
}

export function isIconFile(filePath: string): boolean {
  return path.extname(filePath).toLowerCase() === ".svg"
}
