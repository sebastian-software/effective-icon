import { mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import { createBuilderApiClient } from "../src/api"
import { loadBuilderConfig } from "../src/config"
import { extractSetDataFromPageProps } from "../src/extract"
import { getPackGalleryUrl } from "../src/release"
import { materializeDiscoveredSet } from "../src/materialize"
import { normalizePackIconName, normalizeSvgToCurrentColor } from "../src/normalize"
import { writePack } from "../src/pack"
import { getSvgGridSize, preparePackSvg, validatePackSvg } from "../src/svg"
import {
  PACK_BUGS_URL,
  PACK_OSS_HOMEPAGE_URL,
  PACK_PACKAGE_LICENSE,
  PACK_REDISTRIBUTOR_COPYRIGHT,
  PACK_REPOSITORY_GIT_URL,
  getSharedReleaseVersion,
} from "../src/release"
import { validateReleasePacks } from "../src/validate"
import { fetchGroupedWebsiteSet } from "../src/website-api"
import type { BuilderApiClient, DiscoveredSetData, ExtractedSetData, RegistryEntry } from "../src/types"

const fixturePath = path.resolve(import.meta.dirname, "fixtures", "sample-page-props.json")
const rootFixture = path.resolve(import.meta.dirname, "..", "..", "..")
const tempDirs: string[] = []
const registryEntry: RegistryEntry = {
  slug: "core-line-free",
  packageName: "@icon-pkg/streamline-core-line-free",
  setPageUrl: "https://www.streamlinehq.com/icons/core-line-free",
  family: "Core",
  style: "line",
  license: "CC BY 4.0",
  attributionUrl: "https://www.streamlinehq.com/",
  enabled: true,
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map(async (dir) => {
      await import("node:fs/promises").then(({ rm }) => rm(dir, { recursive: true, force: true }))
    })
  )
})

async function writeTempRootPackageJson(rootDir: string): Promise<void> {
  await writeFile(
    path.join(rootDir, "package.json"),
    JSON.stringify({ name: "test-root", version: await getSharedReleaseVersion(rootFixture) }, null, 2),
    "utf8"
  )
}

describe("streamline builder", () => {
  it("normalizes icon names", () => {
    expect(normalizePackIconName("Alarm Clock")).toBe("alarm-clock")
    expect(normalizePackIconName("browserWebsite1")).toBe("browser-website1")
  })

  it("normalizes monochrome svg colors to currentColor", () => {
    expect(normalizeSvgToCurrentColor('<svg><path stroke="var(--sl-c-000000,#000000)" /></svg>')).toContain(
      'stroke="currentColor"'
    )
    expect(normalizeSvgToCurrentColor('<svg><path fill="#ff0000" /></svg>')).toContain('fill="#ff0000"')
  })

  it("prepares pack svg conservatively before writing", () => {
    const prepared = preparePackSvg(
      '<?xml version="1.0"?><svg viewBox="0 0 24 24" width="24" height="24" role="img"><title>Rocket</title><desc>Decorative</desc><path d="M1 1h22" stroke="#000000" /></svg>',
      {
        packSlug: registryEntry.slug,
        iconName: "rocket",
      }
    )

    expect(prepared).toContain('stroke="currentColor"')
    expect(prepared).toContain('viewBox="0 0 24 24"')
    expect(prepared).not.toContain("width=")
    expect(prepared).not.toContain("height=")
    expect(prepared).not.toContain("<title")
    expect(prepared).not.toContain("<desc")
    expect(prepared).not.toContain('role="img"')
  })

  it("reads the square grid size from the root viewBox", () => {
    expect(getSvgGridSize('<svg viewBox="0 0 14 14"><path /></svg>')).toBe(14)
  })

  it("normalizes offset square viewBoxes to the expected grid size", () => {
    const prepared = preparePackSvg('<svg viewBox="0 -0.5 25 25"><path d="M1 1h20" stroke="#000000" /></svg>')
    expect(prepared).toContain('viewBox="0 0 24 24"')
    expect(getSvgGridSize(prepared)).toBe(24)
  })

  it("writes a mixed-grid label when a pack spans multiple viewBox sizes", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "streamline-builder-mixed-grid-"))
    tempDirs.push(tempDir)
    await writeFile(path.join(tempDir, "LICENSE"), await readFile(path.join(rootFixture, "LICENSE"), "utf8"), "utf8")
    await writeTempRootPackageJson(tempDir)

    await writePack(tempDir, {
      ...extractSetDataFromPageProps(JSON.parse(await readFile(fixturePath, "utf8")), registryEntry),
      icons: [
        {
          name: "icon-24",
          file: "icon-24.svg",
          originalName: "Icon 24",
          sourcePageUrl: registryEntry.setPageUrl,
          category: "Interface Essential",
          categorySlug: "interface-essential",
          subcategory: "Interface Essential",
          subcategorySlug: "interface-essential",
          svg: '<svg viewBox="0 0 24 24"><path d="M1 1h22" stroke="currentColor" /></svg>',
        },
        {
          name: "icon-25",
          file: "icon-25.svg",
          originalName: "Icon 25",
          sourcePageUrl: registryEntry.setPageUrl,
          category: "Interface Essential",
          categorySlug: "interface-essential",
          subcategory: "Interface Essential",
          subcategorySlug: "interface-essential",
          svg: '<svg viewBox="0 0 25 25"><path d="M1 1h23" stroke="currentColor" /></svg>',
        },
      ],
      iconCount: 2,
    })

    const manifest = JSON.parse(
      await readFile(path.join(tempDir, "packages", "packs", "core-line-free", "manifest.json"), "utf8")
    ) as { gridLabel?: string; gridSize?: number }

    expect(manifest.gridSize).toBeUndefined()
    expect(manifest.gridLabel).toBe("24-25 px grid")
  })

  it("keeps multicolor svg fills unchanged when preparing pack svg", () => {
    const prepared = preparePackSvg(
      '<svg viewBox="0 0 24 24"><path d="M1 1h10v10H1z" fill="#ff0000" /><path d="M2 2h20" stroke="#000000" /></svg>'
    )

    expect(prepared).not.toContain('fill="currentColor"')
    expect(prepared).toContain('fill="red"')
    expect(prepared).toContain('stroke="#000"')
  })

  it("rejects inline-unsafe svg constructs", () => {
    expect(() =>
      validatePackSvg('<svg viewBox="0 0 24 24"><defs><path id="a" /></defs><use href="#a" /></svg>', {
        packSlug: registryEntry.slug,
        iconName: "rocket",
      })
    ).toThrow(/Forbidden SVG attribute "id"|Forbidden SVG element <defs>|Forbidden SVG reference "#\.\.\."/)

    expect(() =>
      preparePackSvg('<svg viewBox="0 0 24 24"><path onclick="alert(1)" /></svg>', {
        packSlug: registryEntry.slug,
        iconName: "rocket",
      })
    ).toThrow(/Forbidden inline event handler/)
  })

  it("extracts set data from page props", async () => {
    const pageProps = JSON.parse(await readFile(fixturePath, "utf8"))
    const set = extractSetDataFromPageProps(pageProps, registryEntry)

    expect(set.iconCount).toBe(2)
    expect(set.icons[0]?.name).toBe("add-1")
    expect(set.icons[0]?.categorySlug).toBe("interface-essential")
    expect(set.icons[0]?.svg).toContain("currentColor")
  })

  it("writes a pack directory with manifest and icons", async () => {
    const pageProps = JSON.parse(await readFile(fixturePath, "utf8"))
    const set = extractSetDataFromPageProps(pageProps, registryEntry)
    const tempDir = await mkdtemp(path.join(tmpdir(), "streamline-builder-"))
    tempDirs.push(tempDir)
    await writeFile(path.join(tempDir, "LICENSE"), await readFile(path.join(rootFixture, "LICENSE"), "utf8"), "utf8")
    await writeTempRootPackageJson(tempDir)

    await writePack(tempDir, set)

    const releaseVersion = await getSharedReleaseVersion(tempDir)

    const manifest = JSON.parse(
      await readFile(path.join(tempDir, "packages", "packs", "core-line-free", "manifest.json"), "utf8")
    ) as { familyDescription?: string; gridLabel?: string; gridSize?: number; iconCount: number; version: string; icons: Array<{ file: string }> }
    const packageJson = JSON.parse(
      await readFile(path.join(tempDir, "packages", "packs", "core-line-free", "package.json"), "utf8")
    ) as {
      version?: string
      license?: string
      files?: string[]
      exports?: Record<string, string>
      publishConfig?: { access?: string }
      repository?: { url?: string; directory?: string }
      homepage?: string
      bugs?: { url?: string }
    }
    const licenseText = await readFile(
      path.join(tempDir, "packages", "packs", "core-line-free", "LICENSE"),
      "utf8"
    )
    const readmeText = await readFile(path.join(tempDir, "packages", "packs", "core-line-free", "README.md"), "utf8")
    const galleryText = await readFile(path.join(tempDir, "packages", "packs", "core-line-free", "index.html"), "utf8")

    expect(manifest.iconCount).toBe(2)
    expect(manifest.version).toBe(releaseVersion)
    expect(manifest.familyDescription).toBe("[Free + Open-source] Core is the Helvetica of icons. Licensed under the Creative Commons - CC BY 4.0")
    expect(manifest.gridSize).toBe(14)
    expect(manifest.gridLabel).toBe("14 px grid")
    expect(manifest.icons[0]?.file).toBe("icons/add-1.svg")
    expect(packageJson.version).toBe(releaseVersion)
    expect(packageJson.license).toBe(PACK_PACKAGE_LICENSE)
    expect(packageJson.exports?.["./manifest.json"]).toBe("./manifest.json")
    expect(packageJson.exports?.["./icons/*"]).toBe("./icons/*")
    expect(packageJson.publishConfig?.access).toBe("public")
    expect(packageJson.repository?.url).toBe(PACK_REPOSITORY_GIT_URL)
    expect(packageJson.repository?.directory).toBe("packages/packs/core-line-free")
    expect(packageJson.homepage).toBe(getPackGalleryUrl("core-line-free"))
    expect(packageJson.bugs?.url).toBe(PACK_BUGS_URL)
    expect(
      await readFile(path.join(tempDir, "packages", "packs", "core-line-free", "icons", "add-1.svg"), "utf8")
    ).toContain("currentColor")
    expect(licenseText).toContain("CC BY 4.0")
    expect(licenseText).toContain("https://creativecommons.org/licenses/by/4.0/")
    expect(licenseText).toContain(PACK_REDISTRIBUTOR_COPYRIGHT)
    expect(licenseText).toContain(PACK_OSS_HOMEPAGE_URL)
    expect(packageJson.files).toContain("index.html")
    expect(readmeText).toContain(`Browse icons: ${getPackGalleryUrl("core-line-free")}`)
    expect(readmeText).toContain("`index.html` for a static icon gallery grouped by category")
    expect(galleryText).toContain("<title>@icon-pkg/streamline-core-line-free icon gallery</title>")
    expect(galleryText).toContain("Interface Essential")
    expect(galleryText).toContain('class="subcategory__title"')
    expect(galleryText).toContain("icon-card__name")
    expect(galleryText).toContain("text-overflow: ellipsis")
    expect(galleryText).toContain("text-align: center")
    expect(galleryText).toContain('src="./icons/add-1.svg"')
    expect(galleryText).toContain('data-copy-name="Add 1"')
    expect(galleryText).toContain("Copied icon name")
    expect(galleryText).toContain("[Free + Open-source] Core is the Helvetica of icons. Licensed under the Creative Commons - CC BY 4.0")
    expect(galleryText).toContain("14 px grid")
  })

  it(
    "validates the release pack set in the repository",
    async () => {
      await validateReleasePacks(rootFixture)
    },
    60_000
  )

  it("loads builder config from .env.local", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "streamline-builder-config-"))
    tempDirs.push(tempDir)
    await writeFile(
      path.join(tempDir, ".env.local"),
      "STREAMLINE_API_KEY=test-key\nSTREAMLINE_API_BASE_URL=http://127.0.0.1:4010/\n",
      "utf8"
    )

    const previousKey = process.env.STREAMLINE_API_KEY
    const previousBaseUrl = process.env.STREAMLINE_API_BASE_URL
    delete process.env.STREAMLINE_API_KEY
    delete process.env.STREAMLINE_API_BASE_URL

    try {
      const config = await loadBuilderConfig(tempDir)
      expect(config.apiKey).toBe("test-key")
      expect(config.apiBaseUrl).toBe("http://127.0.0.1:4010")
    } finally {
      restoreEnv("STREAMLINE_API_KEY", previousKey)
      restoreEnv("STREAMLINE_API_BASE_URL", previousBaseUrl)
    }
  })

  it("discovers a set through official api-style endpoints with pagination", async () => {
    const requests: string[] = []
    const client = createBuilderApiClient(
      {
        apiBaseUrl: "https://api.example.test",
        apiKey: "fixture-key",
      },
      {
        fetchImpl: createMockFetch(async (url) => {
          requests.push(url.pathname + url.search)

          if (url.pathname === "/v1/family-groups") {
            return jsonResponse([{ hash: "fgr_core", slug: "core-sets", name: "Core" }])
          }

          if (url.pathname === "/v1/family-groups/fgr_core/families") {
            return jsonResponse([
              {
                hash: "fam_core_line_free",
                slug: "core-line-free",
                name: "Core Line Free",
                description: "Core free family",
              },
            ])
          }

          if (url.pathname === "/v1/families/fam_core_line_free/icons" && url.searchParams.get("offset") === "0") {
            return jsonResponse({
              results: [
                {
                  hash: "ico_rocket",
                  name: "Rocket",
                  categoryName: "Interface Essential",
                  categorySlug: "interface-essential",
                  subcategoryName: "Navigation",
                  subcategorySlug: "navigation",
                  tags: ["launch", "rocket"],
                  svgUrl: "https://assets.example.test/rocket.svg",
                  url: "/icons/core-line-free/rocket",
                },
              ],
              pagination: {
                hasMore: true,
                nextOffset: 1,
              },
            })
          }

          if (url.pathname === "/v1/families/fam_core_line_free/icons" && url.searchParams.get("offset") === "1") {
            return jsonResponse({
              results: [
                {
                  hash: "ico_search",
                  name: "Search",
                  categoryName: "Interface Essential",
                  categorySlug: "interface-essential",
                  subcategoryName: "Search",
                  subcategorySlug: "search",
                  svgUrl: "https://assets.example.test/search.svg",
                },
              ],
              pagination: {
                hasMore: false,
                nextOffset: 1,
              },
            })
          }

          return notFound()
        }),
      }
    )

    const discovered = await client.discoverSet(registryEntry)

    expect(discovered.familyName).toBe("Core Line Free")
    expect(discovered.icons).toHaveLength(2)
    expect(discovered.icons[0]?.hash).toBe("ico_rocket")
    expect(discovered.icons[0]?.svgUrlCandidates).toContain("https://assets.example.test/rocket.svg")
    expect(requests.some((request) => request.startsWith("/v1/family-groups"))).toBe(true)
    expect(requests.some((request) => request.startsWith("/v1/families/fam_core_line_free/icons"))).toBe(true)
  })

  it("materializes icons via public svg urls without using the api download endpoint", async () => {
    const requests: string[] = []
    const apiClient: BuilderApiClient = {
      discoverSet: async () => {
        throw new Error("not used")
      },
      getIconDetails: async () => null,
    }

    const discovered: DiscoveredSetData = {
      slug: registryEntry.slug,
      packageName: registryEntry.packageName,
      setPageUrl: registryEntry.setPageUrl,
      family: registryEntry.family,
      style: registryEntry.style,
      license: registryEntry.license,
      attributionUrl: registryEntry.attributionUrl,
      sourceUrl: registryEntry.setPageUrl,
      familyGroupSlug: "core",
      familyName: "Core Line Free",
      familyDescription: "desc",
      icons: [
        {
          hash: "ico_rocket",
          name: "Rocket",
          category: "Interface Essential",
          categorySlug: "interface-essential",
          subcategory: "Navigation",
          subcategorySlug: "navigation",
          svgUrlCandidates: ["https://assets.example.test/rocket.svg"],
          tags: ["rocket"],
        },
      ],
    }

    const materialized = await materializeDiscoveredSet(registryEntry, discovered, {
      apiClient,
      fetchImpl: createMockFetch(async (url) => {
        requests.push(url.pathname)

        if (url.pathname === "/rocket.svg") {
          return textResponse('<svg viewBox="0 0 24 24"><path d="M1 1h22" stroke="#000000" /></svg>')
        }

        if (url.pathname.includes("/download/svg")) {
          throw new Error("download endpoint should not be used")
        }

        return notFound()
      }),
      loadFallbackSet: async () => {
        throw new Error("fallback should not be used when public svg urls work")
      },
    })

    expect(materialized.icons[0]?.svg).toContain('stroke="currentColor"')
    expect(requests).not.toContain("/v1/icons/ico_rocket/download/svg")
  })

  it("materializes icons with website fallback metadata and keeps tags optional", async () => {
    const apiClient: BuilderApiClient = {
      discoverSet: async () => {
        throw new Error("not used")
      },
      getIconDetails: async () => null,
    }

    const discovered: DiscoveredSetData = {
      slug: registryEntry.slug,
      packageName: registryEntry.packageName,
      setPageUrl: registryEntry.setPageUrl,
      family: registryEntry.family,
      style: registryEntry.style,
      license: registryEntry.license,
      attributionUrl: registryEntry.attributionUrl,
      sourceUrl: registryEntry.setPageUrl,
      familyGroupSlug: "core",
      familyName: "Core Line Free",
      familyDescription: null,
      icons: [
        {
          hash: "ico_search",
          name: "Search",
        },
      ],
    }

    const fallbackSet: ExtractedSetData = {
      slug: registryEntry.slug,
      packageName: registryEntry.packageName,
      setPageUrl: registryEntry.setPageUrl,
      family: registryEntry.family,
      style: registryEntry.style,
      license: registryEntry.license,
      attributionUrl: registryEntry.attributionUrl,
      sourceUrl: registryEntry.setPageUrl,
      familyName: "Core Line Free",
      familyDescription: null,
      iconCount: 1,
      icons: [
        {
          name: "search",
          file: "search.svg",
          originalName: "Search",
          sourcePageUrl: registryEntry.setPageUrl,
          category: "Interface Essential",
          categorySlug: "interface-essential",
          subcategory: "Search",
          subcategorySlug: "search",
          svg: '<svg viewBox="0 0 24 24"><path d="M1 1h22" stroke="#000000" /></svg>',
        },
      ],
    }

    const materialized = await materializeDiscoveredSet(registryEntry, discovered, {
      apiClient,
      loadFallbackSet: async () => fallbackSet,
    })

    expect(materialized.icons[0]?.category).toBe("Interface Essential")
    expect(materialized.icons[0]?.tags).toBeUndefined()
    expect(materialized.icons[0]?.svg).toContain('stroke="currentColor"')
  })

  it("hydrates fallback icons from the website grouped endpoint", async () => {
    const discovered: DiscoveredSetData = {
      slug: registryEntry.slug,
      packageName: registryEntry.packageName,
      setPageUrl: registryEntry.setPageUrl,
      family: registryEntry.family,
      style: registryEntry.style,
      license: registryEntry.license,
      attributionUrl: registryEntry.attributionUrl,
      sourceUrl: registryEntry.setPageUrl,
      familyGroupSlug: "core-sets",
      familyName: "Core Line Free",
      familyDescription: "desc",
      icons: [
        {
          hash: "ico_rocket",
          name: "Rocket",
          category: "Interface Essential",
          categorySlug: "interface-essential",
          subcategory: "Navigation",
          subcategorySlug: "navigation",
        },
        {
          hash: "ico_search",
          name: "Search",
          category: "Interface Essential",
          categorySlug: "interface-essential",
          subcategory: "Search",
          subcategorySlug: "search",
        },
      ],
    }

    const set = await fetchGroupedWebsiteSet(registryEntry, discovered, createMockFetch(async (url) => {
      if (url.pathname === "/v5/icons/grouped/core-line-free" && url.searchParams.get("skip") === "0") {
        return jsonResponse({
          iconsGrouped: {
            subc_a: [
              {
                hash: "ico_rocket",
                slug: "rocket",
                name: "Rocket",
                imagePublicId: "icons/interface-essential/rocket-a.png/rocket-b",
                svg: '<svg viewBox="0 0 24 24"><path d="M1 1h22" stroke="#000000" /></svg>',
                url: "/icons/download/rocket--123",
                familySlug: "core-line-free",
                subcategoryHash: "subc_a",
                subcategoryName: "Navigation",
                isFree: true,
                hasPremiumAccess: true,
                strokeAllowed: true,
                tags: ["launch", "rocket"],
              },
            ],
          },
          pagination: {
            hasMore: true,
            nextSkip: 1,
          },
        })
      }

      if (url.pathname === "/v5/icons/grouped/core-line-free" && url.searchParams.get("skip") === "1") {
        return jsonResponse({
          iconsGrouped: {
            subc_b: [
              {
                hash: "ico_search",
                slug: "search",
                name: "Search",
                imagePublicId: "icons/interface-essential/search-a.png/search-b",
                svg: '<svg viewBox="0 0 24 24"><path d="M1 1h22" stroke="#000000" /></svg>',
                url: "/icons/download/search--123",
                familySlug: "core-line-free",
                subcategoryHash: "subc_b",
                subcategoryName: "Search",
                isFree: true,
                hasPremiumAccess: true,
                strokeAllowed: true,
              },
            ],
          },
          pagination: {
            hasMore: false,
            nextSkip: 1,
          },
        })
      }

      return notFound()
    }))

    expect(set.iconCount).toBe(2)
    expect(set.icons[0]?.svg).toContain('stroke="currentColor"')
    expect(set.icons[0]?.category).toBe("Interface Essential")
    expect(set.icons[0]?.tags).toEqual(["launch", "rocket"])
  })

  it("writes a materialized pack with optional tags omitted from the manifest", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "streamline-builder-pack-"))
    tempDirs.push(tempDir)
    await writeFile(path.join(tempDir, "LICENSE"), await readFile(path.join(rootFixture, "LICENSE"), "utf8"), "utf8")
    await writeTempRootPackageJson(tempDir)

    const set: ExtractedSetData = {
      slug: registryEntry.slug,
      packageName: registryEntry.packageName,
      setPageUrl: registryEntry.setPageUrl,
      family: registryEntry.family,
      style: registryEntry.style,
      license: registryEntry.license,
      attributionUrl: registryEntry.attributionUrl,
      sourceUrl: registryEntry.setPageUrl,
      familyName: "Core Line Free",
      familyDescription: null,
      iconCount: 1,
      icons: [
        {
          name: "rocket",
          file: "rocket.svg",
          originalName: "Rocket",
          sourcePageUrl: registryEntry.setPageUrl,
          category: "Interface Essential",
          categorySlug: "interface-essential",
          subcategory: "Navigation",
          subcategorySlug: "navigation",
          svg: '<svg viewBox="0 0 24 24"><path stroke="currentColor" /></svg>',
        },
      ],
    }

    await writePack(tempDir, set)

    const manifest = JSON.parse(
      await readFile(path.join(tempDir, "packages", "packs", "core-line-free", "manifest.json"), "utf8")
    ) as { icons?: Array<Record<string, unknown>> }

    expect(manifest.icons?.[0]?.tags).toBeUndefined()
  })

  it("disambiguates duplicate normalized icon names with category suffixes", async () => {
    const apiClient: BuilderApiClient = {
      discoverSet: async () => {
        throw new Error("not used")
      },
      getIconDetails: async () => null,
    }

    const discovered: DiscoveredSetData = {
      slug: registryEntry.slug,
      packageName: registryEntry.packageName,
      setPageUrl: registryEntry.setPageUrl,
      family: registryEntry.family,
      style: registryEntry.style,
      license: registryEntry.license,
      attributionUrl: registryEntry.attributionUrl,
      sourceUrl: registryEntry.setPageUrl,
      familyGroupSlug: "core-sets",
      familyName: "Core Line Free",
      familyDescription: null,
      icons: [
        {
          hash: "ico_first",
          name: "Tag",
          category: "Money Shopping",
          categorySlug: "money-shopping",
          subcategory: "Money Shopping",
          subcategorySlug: "money-shopping",
          svg: '<svg viewBox="0 0 24 24"><path d="M1 1h22" stroke="#000000" /></svg>',
        },
        {
          hash: "ico_second",
          name: "Tag",
          category: "Interface Essential",
          categorySlug: "interface-essential",
          subcategory: "Interface Essential",
          subcategorySlug: "interface-essential",
          svg: '<svg viewBox="0 0 24 24"><path d="M1 1h22" stroke="#000000" /></svg>',
        },
      ],
    }

    const materialized = await materializeDiscoveredSet(registryEntry, discovered, {
      apiClient,
    })

    expect(materialized.icons.map((icon) => icon.name).sort()).toEqual(["tag-interface-essential", "tag-money-shopping"])
  })

  it("fails materialization when an svg violates the inline-safe pack contract", async () => {
    const apiClient: BuilderApiClient = {
      discoverSet: async () => {
        throw new Error("not used")
      },
      getIconDetails: async () => null,
    }

    const discovered: DiscoveredSetData = {
      slug: registryEntry.slug,
      packageName: registryEntry.packageName,
      setPageUrl: registryEntry.setPageUrl,
      family: registryEntry.family,
      style: registryEntry.style,
      license: registryEntry.license,
      attributionUrl: registryEntry.attributionUrl,
      sourceUrl: registryEntry.setPageUrl,
      familyGroupSlug: "core-sets",
      familyName: "Core Line Free",
      familyDescription: null,
      icons: [
        {
          hash: "ico_bad",
          name: "Rocket",
          category: "Interface Essential",
          categorySlug: "interface-essential",
          subcategory: "Navigation",
          subcategorySlug: "navigation",
          svg: '<svg viewBox="0 0 24 24"><style>.x{fill:red}</style><path d="M0 0h1v1H0z" /></svg>',
        },
      ],
    }

    await expect(
      materializeDiscoveredSet(registryEntry, discovered, {
        apiClient,
      })
    ).rejects.toThrow(/Forbidden SVG element <style>/)
  })
})

function restoreEnv(key: string, value: string | undefined): void {
  if (value == null) {
    delete process.env[key]
    return
  }

  process.env[key] = value
}

function createMockFetch(
  handler: (url: URL, init?: RequestInit) => Promise<Response> | Response
): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? new URL(input) : input instanceof URL ? input : new URL(input.url)
    return handler(url, init)
  }
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  })
}

function textResponse(payload: string, status = 200): Response {
  return new Response(payload, {
    status,
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
    },
  })
}

function notFound(): Response {
  return jsonResponse({ message: "not found" }, 404)
}
