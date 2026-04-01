import type { ExtractedIcon, ExtractedSetData, RawFamilyCategory, RawGroupedIcon, RegistryEntry } from "./types"
import {
  createPackIconFileName,
  deriveCategorySlugFromImagePublicId,
  normalizePackIconName,
  normalizeSubcategorySlug,
  normalizeSvgToCurrentColor,
} from "./normalize"

interface NextPageData {
  metaTags?: {
    metaDescription?: string
  }
  initialState?: {
    streamlineApi?: {
      queries?: Record<string, { data?: unknown }>
    }
  }
}

export function extractSetDataFromPageProps(pageProps: unknown, entry: RegistryEntry): ExtractedSetData {
  const candidate = pageProps as NextPageData
  const queries = candidate.initialState?.streamlineApi?.queries

  if (!queries) {
    throw new Error(`Missing Streamline query state for "${entry.slug}"`)
  }

  const family = getFamilyQuery(queries, entry.slug)
  const grouped = getGroupedIconsQuery(queries, entry.slug)
  const categories = getCategoriesQuery(queries, entry.slug)
  const categoriesBySlug = new Map(categories.map((category) => [category.slug, category.name]))
  const seenNames = new Set<string>()
  const icons: ExtractedIcon[] = []

  for (const icon of grouped) {
    const categorySlug = deriveCategorySlugFromImagePublicId(icon.imagePublicId)
    const category = categoriesBySlug.get(categorySlug)

    if (!category) {
      throw new Error(`Unknown category slug "${categorySlug}" for "${icon.name}" in "${entry.slug}"`)
    }

    const file = createPackIconFileName(icon.name)
    const normalizedName = normalizePackIconName(icon.name)

    if (seenNames.has(normalizedName)) {
      throw new Error(`Duplicate normalized icon name "${normalizedName}" in "${entry.slug}"`)
    }
    seenNames.add(normalizedName)

    icons.push({
      name: normalizedName,
      file,
      originalName: icon.name,
      sourcePageUrl: new URL(icon.url, "https://www.streamlinehq.com").toString(),
      category,
      categorySlug,
      subcategory: icon.subcategoryName,
      subcategorySlug: normalizeSubcategorySlug(icon.subcategoryName),
      tags: icon.tags && icon.tags.length > 0 ? [...icon.tags].sort() : undefined,
      svg: normalizeSvgToCurrentColor(icon.svg),
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
    sourceUrl: entry.setPageUrl,
    familyName: family.name,
    familyDescription: stripHtml(candidate.metaTags?.metaDescription ?? family.description ?? ""),
    iconCount: icons.length,
    icons: icons.sort((left, right) => left.name.localeCompare(right.name)),
  }
}

function getFamilyQuery(queries: Record<string, { data?: unknown }>, slug: string): {
  name: string
  description?: string
} {
  const entry = queries[`getFamilyBySlug(${slug})?userHash=undefined`]
  const data = entry?.data as Record<string, unknown> | undefined

  if (!data || typeof data.name !== "string") {
    throw new Error(`Missing family metadata for "${slug}"`)
  }

  return {
    name: data.name,
    description: typeof data.description === "string" ? data.description : undefined,
  }
}

function getGroupedIconsQuery(queries: Record<string, { data?: unknown }>, slug: string): RawGroupedIcon[] {
  const entry = queries[`getFamilyOrCategoryIconsGrouped({"familySlug":"${slug}"})`]
  const data = entry?.data as { pages?: Array<{ iconsGrouped?: Record<string, RawGroupedIcon[]> }> } | undefined
  const firstPage = data?.pages?.[0]

  if (!firstPage?.iconsGrouped || typeof firstPage.iconsGrouped !== "object") {
    throw new Error(`Missing grouped icon payload for "${slug}"`)
  }

  return Object.values(firstPage.iconsGrouped).flat()
}

function getCategoriesQuery(queries: Record<string, { data?: unknown }>, slug: string): RawFamilyCategory[] {
  const entry = queries[`getFamilyCategories("${slug}")`]
  const data = entry?.data

  if (!Array.isArray(data)) {
    throw new Error(`Missing category payload for "${slug}"`)
  }

  const categories = data.filter((value): value is RawFamilyCategory => {
    const candidate = value as RawFamilyCategory
    return Boolean(candidate && typeof candidate.slug === "string" && typeof candidate.name === "string")
  })

  if (categories.length === 0) {
    throw new Error(`Empty category payload for "${slug}"`)
  }

  return categories
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || input
}
