import type { BuilderApiClient } from "./types"
import { createPackIconFileName, normalizePackIconName, normalizeSubcategorySlug, normalizeSvgToCurrentColor } from "./normalize"
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
  const detailCache = new Map<string, Promise<DiscoveredIcon | null>>()
  const svgCache = new Map<string, Promise<string | null>>()
  let fallbackSetPromise: Promise<ExtractedSetData> | null = null

  for (const icon of discoveredSet.icons) {
    const normalizedName = normalizePackIconName(icon.name)
    if (seenNames.has(normalizedName)) {
      throw new Error(`Duplicate normalized icon name "${normalizedName}" in "${entry.slug}"`)
    }
    seenNames.add(normalizedName)

    const detail = await getIconDetails(icon.hash, options.apiClient, detailCache)
    const merged = mergeDiscoveredIcon(icon, detail)

    const svg =
      merged.svg ??
      (await fetchSvgFromCandidates(
        [...(merged.svgUrlCandidates ?? []), ...(detail?.svgUrlCandidates ?? [])],
        svgCache,
        options.fetchImpl ?? fetch
      ))

    const fallbackIcon = await getFallbackIconIfNeeded(
      normalizedName,
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
    )

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

    icons.push({
      name: normalizedName,
      file: createPackIconFileName(merged.name),
      originalName: merged.name,
      sourcePageUrl: merged.sourcePageUrl ?? fallbackIcon?.sourcePageUrl ?? entry.setPageUrl,
      category,
      categorySlug,
      subcategory,
      subcategorySlug,
      tags,
      svg: normalizeSvgToCurrentColor(resolvedSvg),
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
