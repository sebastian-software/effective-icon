import type { RegistryEntry } from "./types"

const LICENSE = "CC BY 4.0"
const ATTRIBUTION_URL = "https://www.streamlinehq.com/"

function createEntry(slug: string, family: string, style: string): RegistryEntry {
  return {
    slug,
    packageName: `@icon-pkg/streamline-${slug}`,
    setPageUrl: `https://www.streamlinehq.com/icons/${slug}`,
    family,
    style,
    license: LICENSE,
    attributionUrl: ATTRIBUTION_URL,
    enabled: true,
  }
}

export const registry: RegistryEntry[] = [
  createEntry("core-line-free", "Core", "line"),
  createEntry("core-solid-free", "Core", "solid"),
  createEntry("core-remix-free", "Core", "remix"),
  createEntry("core-pop-free", "Core", "pop"),
  createEntry("core-flat-free", "Core", "flat"),
  createEntry("core-gradient-free", "Core", "gradient"),
  createEntry("flex-line-free", "Flex", "line"),
  createEntry("flex-solid-free", "Flex", "solid"),
  createEntry("flex-remix-free", "Flex", "remix"),
  createEntry("flex-pop-free", "Flex", "pop"),
  createEntry("flex-flat-free", "Flex", "flat"),
  createEntry("flex-gradient-free", "Flex", "gradient"),
  createEntry("sharp-line-free", "Sharp", "line"),
  createEntry("sharp-solid-free", "Sharp", "solid"),
  createEntry("sharp-remix-free", "Sharp", "remix"),
  createEntry("sharp-pop-free", "Sharp", "pop"),
  createEntry("sharp-flat-free", "Sharp", "flat"),
  createEntry("sharp-gradient-free", "Sharp", "gradient"),
  createEntry("plump-line-free", "Plump", "line"),
  createEntry("plump-solid-free", "Plump", "solid"),
  createEntry("plump-remix-free", "Plump", "remix"),
  createEntry("plump-pop-free", "Plump", "pop"),
  createEntry("plump-flat-free", "Plump", "flat"),
  createEntry("plump-gradient-free", "Plump", "gradient"),
  createEntry("material-pro-outlined-fill-free", "Streamline Material", "outlined-fill"),
  createEntry("material-pro-outlined-line-free", "Streamline Material", "outlined-line"),
  createEntry("material-pro-rounded-fill-free", "Streamline Material", "rounded-fill"),
  createEntry("material-pro-rounded-line-free", "Streamline Material", "rounded-line"),
  createEntry("material-pro-sharp-fill-free", "Streamline Material", "sharp-fill"),
  createEntry("material-pro-sharp-line-free", "Streamline Material", "sharp-line"),
  createEntry("ultimate-light-free", "Ultimate", "light"),
  createEntry("ultimate-regular-free", "Ultimate", "regular"),
  createEntry("ultimate-bold-free", "Ultimate", "bold"),
  createEntry("ultimate-colos-free", "Ultimate", "colors"),
]

export function getEnabledRegistry(): RegistryEntry[] {
  return registry.filter((entry) => entry.enabled)
}

export function findRegistryEntry(slug: string): RegistryEntry {
  const entry = registry.find((candidate) => candidate.slug === slug && candidate.enabled)

  if (!entry) {
    throw new Error(`Unknown or disabled Streamline pack slug "${slug}"`)
  }

  return entry
}
