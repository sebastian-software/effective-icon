import path from "node:path"

import { chromium, type Browser } from "playwright"

import { createBuilderApiClient } from "./api"
import { loadBuilderConfig } from "./config"
import { extractSetDataFromPageProps } from "./extract"
import { findRegistryEntry, getEnabledRegistry } from "./registry"
import { materializeDiscoveredSet } from "./materialize"
import { writePack } from "./pack"
import { fetchGroupedWebsiteSet } from "./website-api"

export async function downloadAllPacks(rootDir: string): Promise<void> {
  const config = await loadBuilderConfig(rootDir)
  const apiClient = createBuilderApiClient(config)
  const browserManager = createBrowserManager()

  try {
    for (const entry of getEnabledRegistry()) {
      const set = await downloadSet(entry.slug, rootDir, apiClient, browserManager)
      console.log(`[download] ${entry.slug}: wrote ${set.iconCount} icons`)
    }
  } finally {
    await browserManager.close()
  }
}

export async function downloadSinglePack(rootDir: string, slug: string): Promise<void> {
  const config = await loadBuilderConfig(rootDir)
  const apiClient = createBuilderApiClient(config)
  const browserManager = createBrowserManager()

  try {
    const set = await downloadSet(slug, rootDir, apiClient, browserManager)
    console.log(`[download] ${slug}: wrote ${set.iconCount} icons`)
  } finally {
    await browserManager.close()
  }
}

async function downloadSet(
  slug: string,
  rootDir: string,
  apiClient: ReturnType<typeof createBuilderApiClient>,
  browserManager: ReturnType<typeof createBrowserManager>
) {
  const entry = findRegistryEntry(slug)
  let discoveredSet: Awaited<ReturnType<ReturnType<typeof createBuilderApiClient>["discoverSet"]>> | null = null

  try {
    discoveredSet = await apiClient.discoverSet(entry)
  } catch {
    const fallbackSet = await loadFallbackSet(entry, null, browserManager)
    await writePack(rootDir, fallbackSet)
    return fallbackSet
  }

  const set = await materializeDiscoveredSet(entry, discoveredSet, {
    apiClient,
    loadFallbackSet: () => loadFallbackSet(entry, discoveredSet, browserManager),
  })

  await writePack(rootDir, set)
  return set
}

async function loadFallbackSet(
  entry: ReturnType<typeof findRegistryEntry>,
  discoveredSet: Awaited<ReturnType<ReturnType<typeof createBuilderApiClient>["discoverSet"]>> | null,
  browserManager: ReturnType<typeof createBrowserManager>
) {
  if (discoveredSet) {
    try {
      return await fetchGroupedWebsiteSet(entry, discoveredSet)
    } catch {
      // Fall back to the browser path only when the public grouped endpoint is unavailable.
    }
  }

  const browser = await browserManager.get()
  const page = await browser.newPage()

  try {
    await page.goto(entry.setPageUrl, { waitUntil: "domcontentloaded" })
    await page.waitForFunction(() => Boolean((window as { __NEXT_DATA__?: unknown }).__NEXT_DATA__), undefined, {
      timeout: 30_000,
    })
    const pageProps = await page.evaluate(() => {
      const data = (window as { __NEXT_DATA__?: { props?: { pageProps?: unknown } } }).__NEXT_DATA__
      return data?.props?.pageProps ?? null
    })

    if (!pageProps) {
      const fallback = await page.locator("script#__NEXT_DATA__").textContent()
      if (!fallback) {
        throw new Error(`Unable to extract __NEXT_DATA__ from "${entry.setPageUrl}"`)
      }
      const parsed = JSON.parse(fallback) as { props?: { pageProps?: unknown } }
      return extractSetDataFromPageProps(parsed.props?.pageProps ?? null, entry)
    }

    return extractSetDataFromPageProps(pageProps, entry)
  } finally {
    await page.close()
  }
}

function createBrowserManager() {
  let browserPromise: Promise<Browser> | null = null

  return {
    async get(): Promise<Browser> {
      if (!browserPromise) {
        browserPromise = chromium.launch()
      }
      return browserPromise
    },
    async close(): Promise<void> {
      if (!browserPromise) {
        return
      }

      const browser = await browserPromise
      await browser.close()
    },
  }
}

export function resolveWorkspaceRoot(fromDir: string): string {
  return path.resolve(fromDir, "..", "..", "..")
}
