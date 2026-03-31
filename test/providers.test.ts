import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import AdmZip from "adm-zip"
import { afterEach, describe, expect, it, vi } from "vitest"

import { buildLoaderModule, createVirtualIconRegistry, normalizeIconName } from "../src/manifest"
import { coerceApiManifest, resolveApiIconSet } from "../src/providers/api"
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

  it("loads the api source from a manifest and SVG endpoints", async () => {
    const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input)

      expect(init?.headers).toEqual({ Authorization: "Bearer fixture-token" })

      if (url.endsWith("/manifest.json")) {
        return new Response(
          JSON.stringify({
            icons: {
              regular: {
                rocket: "./icons/rocket.svg",
              },
            },
          }),
          { status: 200 }
        )
      }

      if (url === "https://example.test/base/icons/rocket.svg") {
        return new Response("<svg><path d='M0 0'/></svg>", { status: 200 })
      }

      return new Response("not found", { status: 404, statusText: "Not Found" })
    })

    vi.stubGlobal("fetch", fetchMock)

    const set = await resolveApiIconSet(
      {
        type: "api",
        baseUrl: "https://example.test/base",
        headers: { Authorization: "Bearer fixture-token" },
      },
      "regular",
      { root: process.cwd() }
    )

    expect(set.icons.get("rocket")?.svg).toContain("<svg>")
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("fails clearly when the manifest is missing the requested style", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (input.endsWith("/manifest.json")) {
          return new Response(
            JSON.stringify({
              icons: {
                light: {
                  rocket: "./icons/rocket.svg",
                },
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
        { type: "api", baseUrl: "https://example.test/base", headers: { Authorization: "x" } },
        "regular",
        { root: process.cwd() }
      )
    ).rejects.toThrow('does not contain style "regular"')
  })

  it("fails clearly when an icon fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input)
        if (url.endsWith("/manifest.json")) {
          return new Response(
            JSON.stringify({
              icons: {
                regular: {
                  rocket: "./icons/rocket.svg",
                },
              },
            }),
            { status: 200 }
          )
        }

        return new Response("nope", { status: 404, statusText: "Not Found" })
      })
    )

    await expect(
      resolveApiIconSet(
        { type: "api", baseUrl: "https://example.test/base", headers: { Authorization: "x" } },
        "regular",
        { root: process.cwd() }
      )
    ).rejects.toThrow('Failed to fetch Streamline icon "rocket"')
  })
})

describe("manifest helpers", () => {
  it("coerces the canonical manifest shape and resolves relative URLs", () => {
    const items = coerceApiManifest({
      icons: {
        bold: {
          rocket: "../icons/rocket.svg",
        },
      },
    }, "https://cdn.example.test/manifests/commercial/manifest.json")

    expect(items).toEqual([
      { name: "rocket", style: "bold", url: "https://cdn.example.test/manifests/icons/rocket.svg" },
    ])
  })

  it("rejects unsupported manifest shapes", () => {
    expect(() => coerceApiManifest({ styles: {} }, "https://cdn.example.test/manifest.json")).toThrow(
      "Unsupported Streamline manifest shape"
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
