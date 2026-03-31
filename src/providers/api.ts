import type {
  ApiManifestItem,
  ApiSourceOptions,
  ProviderContext,
  ResolvedIconSet,
  StreamlineIconAsset,
  StreamlineIconStyle,
} from "../types"

interface ApiManifestResponseA {
  icons: Partial<Record<StreamlineIconStyle, Record<string, string>>>
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "")
}

function createManifestUrl(baseUrl: string): string {
  return new URL("manifest.json", `${normalizeBaseUrl(baseUrl)}/`).toString()
}

function formatResponseStatus(response: Response): string {
  return response.statusText ? `${response.status} ${response.statusText}` : String(response.status)
}

export async function resolveApiIconSet(
  options: ApiSourceOptions,
  style: StreamlineIconStyle,
  _context: ProviderContext
): Promise<ResolvedIconSet> {
  const manifest = await fetchApiManifest(options)
  const items = manifest.filter((entry) => entry.style === style)

  if (items.length === 0) {
    throw new Error(`Streamline manifest at ${createManifestUrl(options.baseUrl)} does not contain style "${style}"`)
  }

  const icons = new Map<string, StreamlineIconAsset>()

  for (const item of items) {
    const response = await fetch(item.url, { headers: options.headers })
    if (!response.ok) {
      throw new Error(
        `Failed to fetch Streamline icon "${item.name}": ${item.url} (${formatResponseStatus(response)})`
      )
    }

    icons.set(item.name, {
      name: item.name,
      style,
      origin: "api",
      svg: await response.text(),
    })
  }

  return { style, icons }
}

export async function fetchApiManifest(options: ApiSourceOptions): Promise<ApiManifestItem[]> {
  const manifestUrl = createManifestUrl(options.baseUrl)
  const response = await fetch(manifestUrl, {
    headers: options.headers,
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch Streamline manifest: ${manifestUrl} (${formatResponseStatus(response)})`)
  }

  let json: unknown

  try {
    json = await response.json()
  } catch {
    throw new Error(`Failed to parse Streamline manifest JSON: ${manifestUrl}`)
  }

  return coerceApiManifest(json, manifestUrl)
}

export function coerceApiManifest(input: unknown, manifestUrl: string): ApiManifestItem[] {
  if (typeof input === "object" && input != null && "icons" in input) {
    const items = expandStyleRecord((input as ApiManifestResponseA).icons, manifestUrl)
    if (items.length === 0) {
      throw new Error(`Streamline manifest at ${manifestUrl} does not contain any icons`)
    }
    return items
  }

  throw new Error(`Unsupported Streamline manifest shape at ${manifestUrl}; expected { icons: { <style>: { <name>: <url> } } }`)
}

function expandStyleRecord(
  record: Partial<Record<StreamlineIconStyle, Record<string, string>>> | undefined,
  manifestUrl: string
): ApiManifestItem[] {
  const items: ApiManifestItem[] = []

  for (const style of ["light", "regular", "bold"] as const) {
    const icons = record?.[style] ?? {}
    if (typeof icons !== "object" || icons == null || Array.isArray(icons)) {
      throw new Error(`Invalid icon record for style "${style}" in ${manifestUrl}`)
    }

    for (const [name, url] of Object.entries(icons)) {
      if (typeof url !== "string" || url.length === 0) {
        throw new Error(`Invalid URL for icon "${name}" in style "${style}" at ${manifestUrl}`)
      }

      items.push({
        name,
        style,
        url: new URL(url, manifestUrl).toString(),
      })
    }
  }

  return items.sort((left, right) => left.name.localeCompare(right.name))
}
