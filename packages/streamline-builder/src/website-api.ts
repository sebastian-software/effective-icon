import { createPackIconFileName, deriveCategorySlugFromImagePublicId, normalizePackIconName, normalizeSubcategorySlug } from "./normalize"
import { preparePackSvg } from "./svg"
import type { DiscoveredIcon, DiscoveredSetData, ExtractedIcon, ExtractedSetData, RawGroupedIcon, RegistryEntry } from "./types"

type FetchLike = typeof fetch

const WEBSITE_API_BASE_URL = "https://api-production.streamlinehq.com"
const WEBSITE_ORIGIN = "https://www.streamlinehq.com"

interface GroupedPageResponse {
  iconsGrouped?: Record<string, RawGroupedIcon[]>
  pagination?: {
    hasMore?: boolean
    nextSkip?: number
    offset?: number
  }
}

export async function fetchGroupedWebsiteSet(
  entry: RegistryEntry,
  discoveredSet: DiscoveredSetData,
  fetchImpl: FetchLike = fetch
): Promise<ExtractedSetData> {
  const discoveredByHash = new Map(discoveredSet.icons.map((icon) => [icon.hash, icon]))
  const seenNames = new Set<string>()
  const icons: ExtractedIcon[] = []
  let skip = 0

  while (true) {
    const page = await requestGroupedPage(entry.slug, skip, fetchImpl)
    const groupedIcons = Object.values(page.iconsGrouped ?? {}).flat()

    for (const icon of groupedIcons) {
      const normalizedName = normalizePackIconName(icon.name)
      if (seenNames.has(normalizedName)) {
        continue
      }

      seenNames.add(normalizedName)
      icons.push(toExtractedIcon(icon, discoveredByHash.get(icon.hash), entry))
    }

    const hasMore = page.pagination?.hasMore === true
    if (!hasMore) {
      break
    }

    const nextSkip = page.pagination?.nextSkip
    skip = typeof nextSkip === "number" && Number.isFinite(nextSkip) ? nextSkip : skip + groupedIcons.length
  }

  if (icons.length === 0) {
    throw new Error(`Website grouped API returned no icons for "${entry.slug}"`)
  }

  return {
    slug: entry.slug,
    packageName: entry.packageName,
    setPageUrl: entry.setPageUrl,
    family: entry.family,
    style: entry.style,
    license: entry.license,
    attributionUrl: entry.attributionUrl,
    sourceUrl: entry.setPageUrl,
    familyName: discoveredSet.familyName,
    familyDescription: discoveredSet.familyDescription,
    iconCount: icons.length,
    icons: icons.sort((left, right) => left.name.localeCompare(right.name)),
  }
}

async function requestGroupedPage(slug: string, skip: number, fetchImpl: FetchLike): Promise<GroupedPageResponse> {
  const url = new URL(`/v5/icons/grouped/${encodeURIComponent(slug)}`, WEBSITE_API_BASE_URL)
  url.searchParams.set("skip", String(skip))

  const response = await fetchImpl(url, {
    headers: {
      accept: "application/json",
    },
  })

  if (!response.ok) {
    throw new Error(`Grouped website API request failed for "${slug}" at skip=${skip} with status ${response.status}`)
  }

  return (await response.json()) as GroupedPageResponse
}

function toExtractedIcon(icon: RawGroupedIcon, discovered: DiscoveredIcon | undefined, entry: RegistryEntry): ExtractedIcon {
  const categorySlug = discovered?.categorySlug ?? deriveCategorySlugFromImagePublicId(icon.imagePublicId)
  const category = discovered?.category ?? humanizeSlug(categorySlug)
  const subcategory = discovered?.subcategory ?? icon.subcategoryName
  const subcategorySlug = discovered?.subcategorySlug ?? normalizeSubcategorySlug(icon.subcategoryName)
  const normalizedName = normalizePackIconName(icon.name)

  return {
    name: normalizedName,
    file: createPackIconFileName(icon.name),
    originalName: icon.name,
    sourcePageUrl: new URL(icon.url, WEBSITE_ORIGIN).toString(),
    category,
    categorySlug,
    subcategory,
    subcategorySlug,
    tags: icon.tags && icon.tags.length > 0 ? [...new Set(icon.tags)].sort() : discovered?.tags,
    svg: preparePackSvg(icon.svg, {
      packSlug: entry.slug,
      iconName: normalizedName,
    }),
  }
}

function humanizeSlug(input: string): string {
  return input
    .split("-")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")
}
