import type { RegistryEntry } from "./types"

const LICENSE = "CC BY 4.0"
const ATTRIBUTION_URL = "https://www.streamlinehq.com/"

function createEntry(slug: string, family: string, style: string): RegistryEntry {
  return {
    slug,
    packageName: `@streamline-pkg/${slug}`,
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
  createEntry("core-duo-free", "Core", "duo"),
  createEntry("core-neon-free", "Core", "neon"),
  createEntry("core-flat-free", "Core", "flat"),
  createEntry("core-gradient-free", "Core", "gradient"),
  createEntry("flex-line-free", "Flex", "line"),
  createEntry("flex-solid-free", "Flex", "solid"),
  createEntry("flex-remix-free", "Flex", "remix"),
  createEntry("flex-pop-free", "Flex", "pop"),
  createEntry("flex-duo-free", "Flex", "duo"),
  createEntry("flex-neon-free", "Flex", "neon"),
  createEntry("flex-flat-free", "Flex", "flat"),
  createEntry("flex-gradient-free", "Flex", "gradient"),
  createEntry("sharp-line-free", "Sharp", "line"),
  createEntry("sharp-solid-free", "Sharp", "solid"),
  createEntry("sharp-remix-free", "Sharp", "remix"),
  createEntry("sharp-pop-free", "Sharp", "pop"),
  createEntry("sharp-duo-free", "Sharp", "duo"),
  createEntry("sharp-neon-free", "Sharp", "neon"),
  createEntry("sharp-flat-free", "Sharp", "flat"),
  createEntry("sharp-gradient-free", "Sharp", "gradient"),
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
