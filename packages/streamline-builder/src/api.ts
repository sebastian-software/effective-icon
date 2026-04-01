import type { BuilderConfig } from "./config"
import type {
  ApiFamilyGroup,
  ApiFamilyGroupMember,
  BuilderApiClient,
  DiscoveredIcon,
  DiscoveredSetData,
  IconDetails,
  RegistryEntry,
} from "./types"

type FetchLike = typeof fetch

interface JsonResult<T> {
  data: T
  status: number
}

export function createBuilderApiClient(
  config: BuilderConfig,
  options: {
    fetchImpl?: FetchLike
  } = {}
): BuilderApiClient {
  const fetchImpl = options.fetchImpl ?? fetch

  return {
    async discoverSet(entry) {
      return discoverSetViaApi(entry, config, fetchImpl)
    },
    async getIconDetails(hash) {
      return getIconDetails(hash, config, fetchImpl)
    },
  }
}

export async function discoverSetViaApi(
  entry: RegistryEntry,
  config: BuilderConfig,
  fetchImpl: FetchLike
): Promise<DiscoveredSetData> {
  const groupSlug = deriveGroupSlug(entry.slug)
  const groups = await tryListFamilyGroups(config, fetchImpl)
  const families = await tryListFamilies(groupSlug, config, fetchImpl)
  const family = families.find((candidate) => candidate.slug === entry.slug)
  const icons = await listIconsFromFamily(entry.slug, config, fetchImpl)

  return {
    slug: entry.slug,
    packageName: entry.packageName,
    setPageUrl: entry.setPageUrl,
    family: entry.family,
    style: entry.style,
    license: entry.license,
    attributionUrl: entry.attributionUrl,
    sourceUrl: entry.setPageUrl,
    familyGroupSlug: groups.find((candidate) => candidate.slug === groupSlug)?.slug ?? groupSlug,
    familyName: family?.name ?? entry.slug,
    familyDescription: family?.description ?? null,
    icons,
  }
}

async function tryListFamilyGroups(config: BuilderConfig, fetchImpl: FetchLike): Promise<ApiFamilyGroup[]> {
  return tryEndpoint(
    [
      { path: "/v1/family-groups" },
      { path: "/v1/family-groups/all" },
    ],
    config,
    fetchImpl,
    normalizeFamilyGroups
  )
}

async function tryListFamilies(
  groupSlug: string,
  config: BuilderConfig,
  fetchImpl: FetchLike
): Promise<ApiFamilyGroupMember[]> {
  return tryEndpoint(
    [
      { path: `/v1/family-groups/${encodeURIComponent(groupSlug)}/families` },
      { path: "/v1/families", query: { groupSlug } },
    ],
    config,
    fetchImpl,
    normalizeFamilies
  )
}

async function listIconsFromFamily(
  familySlug: string,
  config: BuilderConfig,
  fetchImpl: FetchLike
): Promise<DiscoveredIcon[]> {
  const endpoint = await resolveWorkingEndpoint(
    [
      { path: `/v1/families/${encodeURIComponent(familySlug)}/icons`, query: { limit: 200, offset: 0, page: 1 } },
      { path: `/v1/search/family/${encodeURIComponent(familySlug)}`, query: { limit: 200, offset: 0, page: 1 } },
      { path: "/v1/search/family", query: { familySlug, limit: 200, offset: 0, page: 1 } },
    ],
    config,
    fetchImpl,
    normalizeIconPage
  )

  const icons: DiscoveredIcon[] = []
  const seenHashes = new Set<string>()
  let offset = 0
  let page = 1

  while (true) {
    const query: Record<string, string | number> = {
      ...(endpoint.query ?? {}),
      limit: 200,
      offset,
      page,
    }

    const result = await requestJson(endpoint.path, config, fetchImpl, query)
    const normalized = normalizeIconPage(result.data)

    for (const icon of normalized.items) {
      if (!seenHashes.has(icon.hash)) {
        seenHashes.add(icon.hash)
        icons.push(icon)
      }
    }

    if (!normalized.pagination.hasMore) {
      break
    }

    offset = normalized.pagination.nextOffset
    page += 1
  }

  if (icons.length === 0) {
    throw new Error(`Official API discovery returned no icons for family "${familySlug}"`)
  }

  return icons
}

async function resolveWorkingEndpoint<T>(
  candidates: EndpointCandidate[],
  config: BuilderConfig,
  fetchImpl: FetchLike,
  normalize: (input: unknown) => T
): Promise<EndpointCandidate> {
  for (const candidate of candidates) {
    try {
      const result = await requestJson(candidate.path, config, fetchImpl, candidate.query)
      normalize(result.data)
      return candidate
    } catch (error) {
      if (!shouldContinue(error)) {
        throw error
      }
    }
  }

  throw new Error(`Unable to resolve a working official API endpoint`)
}

async function tryEndpoint<T>(
  candidates: EndpointCandidate[],
  config: BuilderConfig,
  fetchImpl: FetchLike,
  normalize: (input: unknown) => T
): Promise<T> {
  for (const candidate of candidates) {
    try {
      const result = await requestJson(candidate.path, config, fetchImpl, candidate.query)
      return normalize(result.data)
    } catch (error) {
      if (!shouldContinue(error)) {
        throw error
      }
    }
  }

  return normalize([])
}

export async function getIconDetails(
  hash: string,
  config: BuilderConfig,
  fetchImpl: FetchLike
): Promise<IconDetails | null> {
  try {
    const result = await requestJson(`/v1/icons/${encodeURIComponent(hash)}`, config, fetchImpl)
    return normalizeIconDetails(result.data)
  } catch (error) {
    if (shouldContinue(error)) {
      return null
    }

    throw error
  }
}

async function requestJson(
  pathname: string,
  config: BuilderConfig,
  fetchImpl: FetchLike,
  query?: Record<string, string | number | undefined>
): Promise<JsonResult<unknown>> {
  const url = new URL(pathname, config.apiBaseUrl)

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value == null) {
        continue
      }
      url.searchParams.set(key, String(value))
    }
  }

  const response = await fetchImpl(url, {
    headers: {
      accept: "application/json",
      "x-api-key": config.apiKey,
    },
  })

  if (!response.ok) {
    throw new ApiRequestError(url.toString(), response.status)
  }

  return {
    data: await response.json(),
    status: response.status,
  }
}

function normalizeFamilyGroups(input: unknown): ApiFamilyGroup[] {
  const items = normalizeCollection(input)
  return items
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .flatMap((item) => {
      const slug = readString(item, ["slug", "groupSlug"])
      const name = readString(item, ["name", "title"]) ?? slug
      return slug && name ? [{ slug, name }] : []
    })
}

function normalizeFamilies(input: unknown): ApiFamilyGroupMember[] {
  const items = normalizeCollection(input)
  return items
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .flatMap((item) => {
      const slug = readString(item, ["slug", "familySlug"])
      const name = readString(item, ["name", "title"]) ?? slug
      const description = readString(item, ["description", "metaDescription"])
      return slug && name ? [{ slug, name, ...(description ? { description } : {}) }] : []
    })
}

function normalizeIconPage(input: unknown): {
  items: DiscoveredIcon[]
  pagination: { hasMore: boolean; nextOffset: number }
} {
  const items = normalizeCollection(input)
    .map(normalizeIconSummary)
    .filter((item): item is DiscoveredIcon => Boolean(item))

  const paginationSource = extractPaginationSource(input)
  return {
    items,
    pagination: {
      hasMore: readBoolean(paginationSource, ["hasMore"]) ?? false,
      nextOffset:
        readNumber(paginationSource, ["nextOffset", "nextSkip", "offset"]) ??
        items.length,
    },
  }
}

function normalizeIconSummary(input: unknown): DiscoveredIcon | null {
  const icon = asRecord(input)
  if (!icon) {
    return null
  }

  const hash = readString(icon, ["hash", "id"])
  const name = readString(icon, ["name", "title"])
  if (!hash || !name) {
    return null
  }

  return {
    hash,
    name,
    category: readString(icon, ["categoryName", "category"]),
    categorySlug: readString(icon, ["categorySlug"]),
    subcategory: readString(icon, ["subcategoryName", "subcategory"]),
    subcategorySlug: readString(icon, ["subcategorySlug"]),
    sourcePageUrl: normalizeSourceUrl(readString(icon, ["url", "sourcePageUrl"])),
    svg: readString(icon, ["svg"]),
    svgUrlCandidates: collectSvgUrlCandidates(icon),
    tags: readStringArray(icon.tags),
  }
}

function normalizeIconDetails(input: unknown): IconDetails | null {
  const summary = normalizeIconSummary(input)
  if (!summary) {
    return null
  }

  return {
    ...summary,
  }
}

function normalizeCollection(input: unknown): unknown[] {
  if (Array.isArray(input)) {
    return input
  }

  const record = asRecord(input)
  if (!record) {
    throw new Error("Unexpected API response shape: expected array or object")
  }

  for (const key of ["results", "items", "data", "families", "familyGroups", "icons"]) {
    const value = record[key]
    if (Array.isArray(value)) {
      return value
    }
  }

  throw new Error("Unexpected API response shape: missing collection payload")
}

function extractPaginationSource(input: unknown): Record<string, unknown> | null {
  const record = asRecord(input)
  if (!record) {
    return null
  }

  for (const key of ["pagination", "pageInfo", "meta"]) {
    const value = asRecord(record[key])
    if (value) {
      return value
    }
  }

  return record
}

function collectSvgUrlCandidates(record: Record<string, unknown>): string[] {
  const candidates = new Set<string>()

  walk(record, (_key, value) => {
    if (typeof value !== "string") {
      return
    }

    if (!/^https?:\/\//.test(value)) {
      return
    }

    if (value.includes(".svg") || value.includes("/svg")) {
      candidates.add(value)
    }
  })

  return [...candidates]
}

function walk(input: unknown, visit: (key: string, value: unknown) => void, depth = 0): void {
  if (depth > 3) {
    return
  }

  if (Array.isArray(input)) {
    for (const value of input) {
      walk(value, visit, depth + 1)
    }
    return
  }

  const record = asRecord(input)
  if (!record) {
    return
  }

  for (const [key, value] of Object.entries(record)) {
    visit(key, value)
    walk(value, visit, depth + 1)
  }
}

function asRecord(input: unknown): Record<string, unknown> | null {
  return typeof input === "object" && input != null ? (input as Record<string, unknown>) : null
}

function readString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value) {
      return value
    }
  }
  return undefined
}

function readStringArray(input: unknown): string[] | undefined {
  if (!Array.isArray(input)) {
    return undefined
  }

  const values = input.filter((value): value is string => typeof value === "string" && value.length > 0)
  return values.length > 0 ? values : undefined
}

function readBoolean(record: Record<string, unknown> | null, keys: string[]): boolean | undefined {
  if (!record) {
    return undefined
  }

  for (const key of keys) {
    const value = record[key]
    if (typeof value === "boolean") {
      return value
    }
  }

  return undefined
}

function readNumber(record: Record<string, unknown> | null, keys: string[]): number | undefined {
  if (!record) {
    return undefined
  }

  for (const key of keys) {
    const value = record[key]
    if (typeof value === "number" && Number.isFinite(value)) {
      return value
    }
  }

  return undefined
}

function normalizeSourceUrl(input: string | undefined): string | undefined {
  if (!input) {
    return undefined
  }

  return /^https?:\/\//.test(input) ? input : new URL(input, "https://www.streamlinehq.com").toString()
}

function deriveGroupSlug(familySlug: string): string {
  return familySlug.split("-")[0] ?? familySlug
}

interface EndpointCandidate {
  path: string
  query?: Record<string, string | number>
}

class ApiRequestError extends Error {
  constructor(
    readonly url: string,
    readonly status: number
  ) {
    super(`Request to "${url}" failed with status ${status}`)
  }
}

function shouldContinue(error: unknown): boolean {
  return error instanceof ApiRequestError && error.status === 404
}
