import path from "node:path"

import { chromium, type Browser } from "playwright"

import { extractSetDataFromPageProps } from "./extract"
import { findRegistryEntry, getEnabledRegistry } from "./registry"
import { writePack } from "./pack"

export async function downloadAllPacks(rootDir: string): Promise<void> {
  const browser = await chromium.launch()

  try {
    for (const entry of getEnabledRegistry()) {
      const set = await downloadSet(entry.slug, rootDir, browser)
      console.log(`[download] ${entry.slug}: wrote ${set.iconCount} icons`)
    }
  } finally {
    await browser.close()
  }
}

export async function downloadSinglePack(rootDir: string, slug: string): Promise<void> {
  const browser = await chromium.launch()

  try {
    const set = await downloadSet(slug, rootDir, browser)
    console.log(`[download] ${slug}: wrote ${set.iconCount} icons`)
  } finally {
    await browser.close()
  }
}

async function downloadSet(slug: string, rootDir: string, browser: Browser) {
  const entry = findRegistryEntry(slug)
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
      const set = extractSetDataFromPageProps(parsed.props?.pageProps ?? null, entry)
      await writePack(rootDir, set)
      return set
    }

    const set = extractSetDataFromPageProps(pageProps, entry)
    await writePack(rootDir, set)
    return set
  } finally {
    await page.close()
  }
}

export function resolveWorkspaceRoot(fromDir: string): string {
  return path.resolve(fromDir, "..", "..", "..")
}
