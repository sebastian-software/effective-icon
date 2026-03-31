import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import AdmZip from "adm-zip"
import { afterEach, describe, expect, it, vi } from "vitest"

import { buildLoaderModule, createVirtualIconRegistry, normalizeIconName } from "../src/manifest"
import { coerceSearchResponse, resolveApiIconSet } from "../src/providers/api"
import { resolveArchiveIconSet } from "../src/providers/archive"
import { resolveDirectoryIconSet } from "../src/providers/directory"
import { resolveFreeIconSet } from "../src/providers/free"

const fixtureRoot = path.resolve(process.cwd(), "fixtures/icons")

afterEach(() => {
  vi.restoreAllMocks()
})

describe("normalizeIconName", () => {
  it("normalizes mixed icon file names", () => {
    expect(normalizeIconName("Arrow Up Circle.svg")).toBe("arrow-up-circle")
    expect(normalizeIconName("alertCircleBold.svg")).toBe("alert-circle-bold")
  })
})

describe("providers", () => {
  it("loads the free source from built-in assets", async () => {
    const set = await resolveFreeIconSet(
      { type: "free", assetsDir: path.resolve(process.cwd(), "assets/free") },
      "regular",
      { root: process.cwd() }
    )

    expect([...set.icons.keys()].sort()).toEqual(["rocket", "search"])
  })

  it("loads the directory source", async () => {
    const set = await resolveDirectoryIconSet(
      { type: "directory", path: fixtureRoot },
      "bold",
      { root: process.cwd() }
    )

    expect(set.icons.get("rocket")?.origin).toBe("directory")
    expect(set.icons.get("search")?.path).toContain("search.svg")
  })

  it("loads the archive source", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "vite-plugin-streamline-test-"))
    const zipPath = path.join(tempDir, "icons.zip")
    const zip = new AdmZip()
    zip.addLocalFolder(fixtureRoot)
    zip.writeZip(zipPath)

    const set = await resolveArchiveIconSet(
      { type: "archive", path: zipPath },
      "light",
      { root: process.cwd() }
    )

    expect(set.icons.get("rocket")?.origin).toBe("archive")
    expect(set.icons.get("rocket")?.svg).toContain("<svg")
    expect(set.icons.get("rocket")?.path).toBeUndefined()
    expect(set.icons.get("search")).toBeDefined()

    await rm(tempDir, { recursive: true, force: true })
  })

  it("loads the api source from the official search and svg endpoints", async () => {
    const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input)

      if (url === "https://example.test/v1/search/global?productType=icons&query=rocket&style=regular&productTier=free") {
        expect(init?.headers).toEqual({
          "x-api-key": "fixture-token",
          accept: "application/json",
        })
        return new Response(
          JSON.stringify({
            query: "rocket",
            results: [
              {
                hash: "ico_rocket",
                name: "Rocket Regular",
                imagePreviewUrl: "https://assets.example.test/rocket.png",
                isFree: true,
                familySlug: "fixture-regular",
                familyName: "Fixture Regular",
                categorySlug: "interface-essential",
                categoryName: "Interface Essential",
                subcategorySlug: "navigation",
                subcategoryName: "Navigation",
              },
            ],
            pagination: {
              total: 1,
              hasMore: false,
              offset: 0,
              nextOffset: 0,
            },
          }),
          { status: 200 }
        )
      }

      if (url === "https://example.test/v1/icons/ico_rocket/download/svg?responsive=true") {
        expect(init?.headers).toEqual({
          "x-api-key": "fixture-token",
          accept: "image/svg+xml",
        })
        return new Response("<svg><path d='M0 0'/></svg>", { status: 200 })
      }

      return new Response("not found", { status: 404, statusText: "Not Found" })
    })

    vi.stubGlobal("fetch", fetchMock)

    const set = await resolveApiIconSet(
      {
        type: "api",
        baseUrl: "https://example.test",
        apiKey: "fixture-token",
        familySlug: "fixture-regular",
        icons: ["rocket"],
        productTier: "free",
      },
      "regular",
      { root: process.cwd() }
    )

    expect(set.icons.get("rocket")?.svg).toContain("<svg>")
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("fails clearly when the search query has no exact match", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (input === "https://example.test/v1/search/global?productType=icons&query=rocket&style=regular") {
          return new Response(
            JSON.stringify({
              query: "rocket",
              results: [],
              pagination: {
                total: 0,
                hasMore: false,
                offset: 0,
                nextOffset: 0,
              },
            }),
            { status: 200 }
          )
        }

        return new Response("not found", { status: 404, statusText: "Not Found" })
      })
    )

    await expect(
      resolveApiIconSet(
        { type: "api", baseUrl: "https://example.test", apiKey: "x", icons: ["rocket"] },
        "regular",
        { root: process.cwd() }
      )
    ).rejects.toThrow('did not return an exact icon match')
  })

  it("fails clearly when an icon download fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input)
        if (url === "https://example.test/v1/search/global?productType=icons&query=rocket&style=regular") {
          return new Response(
            JSON.stringify({
              query: "rocket",
              results: [
                {
                  hash: "ico_rocket",
                  name: "Rocket Regular",
                  imagePreviewUrl: "https://assets.example.test/rocket.png",
                  isFree: true,
                  familySlug: "fixture-regular",
                  familyName: "Fixture Regular",
                  categorySlug: "interface-essential",
                  categoryName: "Interface Essential",
                  subcategorySlug: "navigation",
                  subcategoryName: "Navigation",
                },
              ],
              pagination: {
                total: 1,
                hasMore: false,
                offset: 0,
                nextOffset: 0,
              },
            }),
            { status: 200 }
          )
        }

        if (url === "https://example.test/v1/icons/ico_rocket/download/svg?responsive=true") {
          return new Response("nope", { status: 404, statusText: "Not Found" })
        }

        return new Response("not found", { status: 404, statusText: "Not Found" })
      })
    )

    await expect(
      resolveApiIconSet(
        {
          type: "api",
          baseUrl: "https://example.test",
          apiKey: "x",
          familySlug: "fixture-regular",
          icons: ["rocket"],
        },
        "regular",
        { root: process.cwd() }
      )
    ).rejects.toThrow('Failed to download Streamline icon "rocket"')
  })

  it("fails clearly when exact matches are ambiguous without a family slug", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input)

        if (url === "https://example.test/v1/search/global?productType=icons&query=rocket&style=regular") {
          return new Response(
            JSON.stringify({
              query: "rocket",
              results: [
                {
                  hash: "ico_rocket_light",
                  name: "Rocket Regular",
                  imagePreviewUrl: "https://assets.example.test/rocket-light.png",
                  isFree: true,
                  familySlug: "fixture-light",
                  familyName: "Fixture Light",
                  categorySlug: "interface-essential",
                  categoryName: "Interface Essential",
                  subcategorySlug: "navigation",
                  subcategoryName: "Navigation",
                },
                {
                  hash: "ico_rocket_regular",
                  name: "Rocket Regular",
                  imagePreviewUrl: "https://assets.example.test/rocket-regular.png",
                  isFree: true,
                  familySlug: "fixture-regular",
                  familyName: "Fixture Regular",
                  categorySlug: "interface-essential",
                  categoryName: "Interface Essential",
                  subcategorySlug: "navigation",
                  subcategoryName: "Navigation",
                },
              ],
              pagination: {
                total: 2,
                hasMore: false,
                offset: 0,
                nextOffset: 0,
              },
            }),
            { status: 200 }
          )
        }

        return new Response("unexpected call", { status: 500 })
      })
    )

    await expect(
      resolveApiIconSet(
        { type: "api", baseUrl: "https://example.test", apiKey: "x", icons: ["rocket"] },
        "regular",
        { root: process.cwd() }
      )
    ).rejects.toThrow("set source.familySlug to disambiguate")
  })
})

describe("api helpers", () => {
  it("coerces the official search response shape", () => {
    const response = coerceSearchResponse(
      {
        query: "rocket",
        results: [
          {
            hash: "ico_rocket",
            name: "rocket",
            imagePreviewUrl: "https://assets.example.test/rocket.png",
            isFree: true,
            familySlug: "ultimate-light-free",
            familyName: "Ultimate Light - Free",
            categorySlug: "interface-essential",
            categoryName: "Interface Essential",
            subcategorySlug: "navigation",
            subcategoryName: "Navigation",
          },
        ],
        pagination: {
          total: 1,
          hasMore: false,
          offset: 0,
          nextOffset: 0,
        },
      },
      "rocket",
      "https://public-api.streamlinehq.com/v1/search/global?query=rocket"
    )

    expect(response.results[0]?.hash).toBe("ico_rocket")
  })

  it("rejects unsupported search response shapes", () => {
    expect(() =>
      coerceSearchResponse(
        { styles: {} },
        "rocket",
        "https://public-api.streamlinehq.com/v1/search/global?query=rocket"
      )
    ).toThrow(
      "Unsupported Streamline search response"
    )
  })

  it("builds a lazy loader module from a registry", async () => {
    const set = await resolveDirectoryIconSet(
      { type: "directory", path: fixtureRoot },
      "regular",
      { root: process.cwd() }
    )
    const registry = createVirtualIconRegistry(set)
    const code = buildLoaderModule(registry)

    expect(code).toContain("loadIcon")
    expect(code).toContain('"rocket"')
    expect(code).toContain("selectedStyle")
  })
})
