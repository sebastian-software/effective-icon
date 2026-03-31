import type {
  ApiSourceOptions,
  ProviderContext,
  ResolvedIconSet,
  StreamlineIconAsset,
  StreamlineIconStyle,
} from "../types"

const DEFAULT_STREAMLINE_API_BASE_URL = "https://public-api.streamlinehq.com"

interface StreamlineSearchResult {
  hash: string
  name: string
  imagePreviewUrl: string
  isFree: boolean
  familySlug: string
  familyName: string
  categorySlug: string
  categoryName: string
  subcategorySlug: string
  subcategoryName: string
}

interface StreamlineSearchResponse {
  query: string
  results: StreamlineSearchResult[]
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "")
}

function createApiBaseUrl(baseUrl?: string): string {
  return normalizeBaseUrl(baseUrl ?? DEFAULT_STREAMLINE_API_BASE_URL)
}

function createSearchUrl(baseUrl: string, query: string): string {
  const url = new URL("/v1/search/global", `${normalizeBaseUrl(baseUrl)}/`)
  url.searchParams.set("query", query)
  return url.toString()
}

function createSvgDownloadUrl(baseUrl: string, hash: string): string {
  return new URL(`/v1/icons/${encodeURIComponent(hash)}/download/svg`, `${normalizeBaseUrl(baseUrl)}/`).toString()
}

function formatResponseStatus(response: Response): string {
  return response.statusText ? `${response.status} ${response.statusText}` : String(response.status)
}

function createAuthHeaders(apiKey: string, accept?: string): HeadersInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
  }

  if (accept) {
    headers.accept = accept
  }

  return headers
}

export async function resolveApiIconSet(
  options: ApiSourceOptions,
  style: StreamlineIconStyle,
  _context: ProviderContext
): Promise<ResolvedIconSet> {
  if (options.icons.length === 0) {
    throw new Error("Streamline API source requires at least one icon name")
  }

  const baseUrl = createApiBaseUrl(options.baseUrl)
  const icons = new Map<string, StreamlineIconAsset>()

  for (const requestedName of options.icons) {
    const searchResponse = await fetchSearchResponse(baseUrl, requestedName, options.apiKey)
    const match = selectSearchResult(searchResponse, requestedName, options.familySlug)
    const response = await fetch(createSvgDownloadUrl(baseUrl, match.hash), {
      headers: createAuthHeaders(options.apiKey, "image/svg+xml"),
    })

    if (!response.ok) {
      throw new Error(
        `Failed to download Streamline icon "${requestedName}": ${createSvgDownloadUrl(baseUrl, match.hash)} (${formatResponseStatus(response)})`
      )
    }

    const normalizedName = normalizeSearchName(requestedName)
    icons.set(normalizedName, {
      name: normalizedName,
      style,
      origin: "api",
      svg: await response.text(),
    })
  }

  return { style, icons }
}

async function fetchSearchResponse(
  baseUrl: string,
  query: string,
  apiKey: string
): Promise<StreamlineSearchResponse> {
  const url = createSearchUrl(baseUrl, query)
  const response = await fetch(url, {
    headers: createAuthHeaders(apiKey, "application/json"),
  })

  if (!response.ok) {
    throw new Error(`Failed to search Streamline API for "${query}": ${url} (${formatResponseStatus(response)})`)
  }

  let json: unknown

  try {
    json = await response.json()
  } catch {
    throw new Error(`Failed to parse Streamline search response: ${url}`)
  }

  return coerceSearchResponse(json, query, url)
}

export function coerceSearchResponse(
  input: unknown,
  query: string,
  url: string
): StreamlineSearchResponse {
  if (typeof input !== "object" || input == null || !("query" in input) || !("results" in input)) {
    throw new Error(`Unsupported Streamline search response at ${url}`)
  }

  const rawQuery = input.query
  const rawResults = input.results

  if (typeof rawQuery !== "string" || !Array.isArray(rawResults)) {
    throw new Error(`Unsupported Streamline search response at ${url}`)
  }

  if (rawQuery !== query) {
    throw new Error(`Streamline search response query mismatch at ${url}; expected "${query}", received "${rawQuery}"`)
  }

  return {
    query: rawQuery,
    results: rawResults.map((entry, index) => assertSearchResult(entry, index, url)),
  }
}

function assertSearchResult(
  input: unknown,
  index: number,
  url: string
): StreamlineSearchResult {
  const candidate = input as Record<string, unknown>

  if (
    typeof input === "object" &&
    input != null &&
    typeof candidate.hash === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.imagePreviewUrl === "string" &&
    typeof candidate.isFree === "boolean" &&
    typeof candidate.familySlug === "string" &&
    typeof candidate.familyName === "string" &&
    typeof candidate.categorySlug === "string" &&
    typeof candidate.categoryName === "string" &&
    typeof candidate.subcategorySlug === "string" &&
    typeof candidate.subcategoryName === "string"
  ) {
    return {
      hash: candidate.hash,
      name: candidate.name,
      imagePreviewUrl: candidate.imagePreviewUrl,
      isFree: candidate.isFree,
      familySlug: candidate.familySlug,
      familyName: candidate.familyName,
      categorySlug: candidate.categorySlug,
      categoryName: candidate.categoryName,
      subcategorySlug: candidate.subcategorySlug,
      subcategoryName: candidate.subcategoryName,
    }
  }

  throw new Error(`Invalid Streamline search result at ${url} (index ${index})`)
}

function selectSearchResult(
  response: StreamlineSearchResponse,
  requestedName: string,
  familySlug?: string
): StreamlineSearchResult {
  const normalizedName = normalizeSearchName(requestedName)
  const exactMatches = response.results.filter((result) => normalizeSearchName(result.name) === normalizedName)

  if (familySlug) {
    const familyMatches = exactMatches.filter((result) => result.familySlug === familySlug)
    if (familyMatches.length === 0) {
      throw new Error(
        `Streamline search for "${requestedName}" did not return an exact match in family "${familySlug}"`
      )
    }
    return familyMatches[0]
  }

  if (exactMatches.length === 0) {
    throw new Error(`Streamline search for "${requestedName}" did not return an exact icon match`)
  }

  if (exactMatches.length > 1) {
    const families = [...new Set(exactMatches.map((result) => result.familySlug))].sort().join(", ")
    throw new Error(
      `Streamline search for "${requestedName}" returned multiple exact matches; set source.familySlug to disambiguate (${families})`
    )
  }

  return exactMatches[0]
}

function normalizeSearchName(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
}
