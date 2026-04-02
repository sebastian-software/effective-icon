import type { BuilderApiClient } from "./types"
import { createPackIconFileName, normalizePackIconName, normalizeSubcategorySlug } from "./normalize"
import { preparePackSvg } from "./svg"
import type { DiscoveredIcon, DiscoveredSetData, ExtractedIcon, ExtractedSetData, RegistryEntry } from "./types"

type FetchLike = typeof fetch

export interface MaterializeOptions {
  apiClient: BuilderApiClient
  fetchImpl?: FetchLike
  loadFallbackSet?: () => Promise<ExtractedSetData>
}

export async function materializeDiscoveredSet(
  entry: RegistryEntry,
  discoveredSet: DiscoveredSetData,
  options: MaterializeOptions
): Promise<ExtractedSetData> {
  const icons: ExtractedIcon[] = []
  const seenNames = new Set<string>()
  const baseNameCounts = countBaseNames(discoveredSet.icons)
  const detailCache = new Map<string, Promise<DiscoveredIcon | null>>()
  const svgCache = new Map<string, Promise<string | null>>()
  let fallbackSetPromise: Promise<ExtractedSetData> | null = null

  for (const icon of discoveredSet.icons) {
    const normalizedBaseName = normalizePackIconName(icon.name)

    const initialFallbackIcon = shouldUseInitialFallback(icon)
      ? await getFallbackIconIfNeeded(normalizedBaseName, icon, options, () => {
          if (!fallbackSetPromise && options.loadFallbackSet) {
            fallbackSetPromise = options.loadFallbackSet()
          }
          return fallbackSetPromise
        })
      : undefined

    const detail = needsDetails(icon, initialFallbackIcon)
      ? await getIconDetails(icon.hash, options.apiClient, detailCache)
      : null
    const merged = mergeDiscoveredIcon(icon, detail)

    const svg =
      merged.svg ??
      (await fetchSvgFromCandidates(
        [...(merged.svgUrlCandidates ?? []), ...(detail?.svgUrlCandidates ?? [])],
        svgCache,
        options.fetchImpl ?? fetch
      ))

    const fallbackIcon =
      initialFallbackIcon ??
      (await getFallbackIconIfNeeded(
        normalizedBaseName,
        {
          ...merged,
          svg: svg ?? undefined,
        },
        options,
        () => {
          if (!fallbackSetPromise && options.loadFallbackSet) {
            fallbackSetPromise = options.loadFallbackSet()
          }
          return fallbackSetPromise
        }
      ))

    const resolvedSvg = svg ?? fallbackIcon?.svg

    if (!resolvedSvg) {
      throw new Error(`Unable to resolve SVG for "${merged.name}" in "${entry.slug}"`)
    }

    const category = merged.category ?? fallbackIcon?.category
    const categorySlug = merged.categorySlug ?? fallbackIcon?.categorySlug ?? (category ? normalizePackIconName(category) : undefined)
    const subcategory = merged.subcategory ?? fallbackIcon?.subcategory
    const subcategorySlug =
      merged.subcategorySlug ??
      fallbackIcon?.subcategorySlug ??
      (subcategory ? normalizeSubcategorySlug(subcategory) : undefined)

    if (!category || !categorySlug) {
      throw new Error(`Missing category metadata for "${merged.name}" in "${entry.slug}"`)
    }
    if (!subcategory || !subcategorySlug) {
      throw new Error(`Missing subcategory metadata for "${merged.name}" in "${entry.slug}"`)
    }

    const tags = dedupeAndSort(merged.tags ?? fallbackIcon?.tags)
    const resolvedName = resolveIconName({
      baseName: normalizedBaseName,
      categorySlug,
      subcategorySlug,
      hash: icon.hash,
      duplicate: (baseNameCounts.get(normalizedBaseName) ?? 0) > 1,
      seenNames,
    })

    icons.push({
      name: resolvedName,
      file: createPackIconFileName(resolvedName),
      originalName: merged.name,
      sourcePageUrl: merged.sourcePageUrl ?? fallbackIcon?.sourcePageUrl ?? entry.setPageUrl,
      category,
      categorySlug,
      subcategory,
      subcategorySlug,
      tags,
      svg: preparePackSvg(resolvedSvg, {
        packSlug: entry.slug,
        iconName: resolvedName,
      }),
    })
  }

  return {
    slug: entry.slug,
    packageName: entry.packageName,
    setPageUrl: entry.setPageUrl,
    family: entry.family,
    style: entry.style,
    license: entry.license,
    attributionUrl: entry.attributionUrl,
    sourceUrl: discoveredSet.sourceUrl,
    familyName: discoveredSet.familyName,
    familyDescription: discoveredSet.familyDescription,
    iconCount: icons.length,
    icons: icons.sort((left, right) => left.name.localeCompare(right.name)),
  }
}

async function getIconDetails(
  hash: string,
  apiClient: BuilderApiClient,
  cache: Map<string, Promise<DiscoveredIcon | null>>
): Promise<DiscoveredIcon | null> {
  if (!cache.has(hash)) {
    cache.set(
      hash,
      apiClient.getIconDetails(hash).then((value) => value)
    )
  }

  return cache.get(hash) ?? null
}

async function getFallbackIconIfNeeded(
  normalizedName: string,
  icon: DiscoveredIcon,
  options: MaterializeOptions,
  loadFallbackSet: () => Promise<ExtractedSetData> | null
): Promise<ExtractedIcon | undefined> {
  if (
    icon.svg &&
    icon.category &&
    icon.categorySlug &&
    icon.subcategory &&
    icon.subcategorySlug
  ) {
    return undefined
  }

  const fallbackSet = loadFallbackSet()
  if (!fallbackSet) {
    return undefined
  }

  const set = await fallbackSet
  return set.icons.find((candidate) => candidate.name === normalizedName)
}

async function fetchSvgFromCandidates(
  candidates: string[],
  cache: Map<string, Promise<string | null>>,
  fetchImpl: FetchLike
): Promise<string | null> {
  const uniqueCandidates = [...new Set(candidates.filter(Boolean))]

  for (const candidate of uniqueCandidates) {
    if (!cache.has(candidate)) {
      cache.set(candidate, fetchSvg(candidate, fetchImpl))
    }

    const svg = await cache.get(candidate)
    if (svg) {
      return svg
    }
  }

  return null
}

async function fetchSvg(url: string, fetchImpl: FetchLike): Promise<string | null> {
  try {
    const response = await fetchImpl(url, {
      headers: {
        accept: "image/svg+xml,text/plain;q=0.9,*/*;q=0.1",
      },
    })

    if (!response.ok) {
      return null
    }

    const body = await response.text()
    return body.includes("<svg") ? body : null
  } catch {
    return null
  }
}

function mergeDiscoveredIcon(primary: DiscoveredIcon, detail: DiscoveredIcon | null): DiscoveredIcon {
  if (!detail) {
    return primary
  }

  return {
    ...detail,
    ...primary,
    svg: primary.svg ?? detail.svg,
    svgUrlCandidates: [...new Set([...(primary.svgUrlCandidates ?? []), ...(detail.svgUrlCandidates ?? [])])],
    tags: primary.tags ?? detail.tags,
    category: primary.category ?? detail.category,
    categorySlug: primary.categorySlug ?? detail.categorySlug,
    subcategory: primary.subcategory ?? detail.subcategory,
    subcategorySlug: primary.subcategorySlug ?? detail.subcategorySlug,
    sourcePageUrl: primary.sourcePageUrl ?? detail.sourcePageUrl,
  }
}

function dedupeAndSort(values: string[] | undefined): string[] | undefined {
  if (!values || values.length === 0) {
    return undefined
  }

  return [...new Set(values)].sort()
}

function needsDetails(icon: DiscoveredIcon, fallbackIcon: ExtractedIcon | undefined): boolean {
  return !Boolean(
    (icon.svg || fallbackIcon?.svg) &&
      (icon.category || fallbackIcon?.category) &&
      (icon.categorySlug || fallbackIcon?.categorySlug) &&
      (icon.subcategory || fallbackIcon?.subcategory) &&
      (icon.subcategorySlug || fallbackIcon?.subcategorySlug)
  )
}

function shouldUseInitialFallback(icon: DiscoveredIcon): boolean {
  return !Boolean(
    icon.svg ||
      (icon.svgUrlCandidates && icon.svgUrlCandidates.length > 0)
  )
}

function countBaseNames(icons: DiscoveredIcon[]): Map<string, number> {
  const counts = new Map<string, number>()

  for (const icon of icons) {
    const baseName = normalizePackIconName(icon.name)
    counts.set(baseName, (counts.get(baseName) ?? 0) + 1)
  }

  return counts
}

function resolveIconName(input: {
  baseName: string
  categorySlug: string
  subcategorySlug: string
  hash: string
  duplicate: boolean
  seenNames: Set<string>
}): string {
  const candidates = input.duplicate
    ? [
        `${input.baseName}-${input.categorySlug}`,
        `${input.baseName}-${input.subcategorySlug}`,
        `${input.baseName}-${stripHashPrefix(input.hash).slice(0, 8)}`,
      ]
    : [input.baseName]

  for (const candidate of candidates) {
    const normalized = normalizePackIconName(candidate)
    if (!input.seenNames.has(normalized)) {
      input.seenNames.add(normalized)
      return normalized
    }
  }

  const finalCandidate = normalizePackIconName(`${input.baseName}-${stripHashPrefix(input.hash)}`)
  if (input.seenNames.has(finalCandidate)) {
    throw new Error(`Unable to resolve duplicate icon name "${input.baseName}" in a deterministic way`)
  }

  input.seenNames.add(finalCandidate)
  return finalCandidate
}

function stripHashPrefix(hash: string): string {
  return hash.replace(/^[a-z]+_/i, "")
}
