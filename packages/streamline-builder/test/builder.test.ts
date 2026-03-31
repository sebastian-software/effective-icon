import { mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import { extractSetDataFromPageProps } from "../src/extract"
import { normalizePackIconName, normalizeSvgToCurrentColor } from "../src/normalize"
import { writePack } from "../src/pack"

const fixturePath = path.resolve(import.meta.dirname, "fixtures", "sample-page-props.json")
const rootFixture = path.resolve(import.meta.dirname, "..", "..", "..")
const tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map(async (dir) => {
      await import("node:fs/promises").then(({ rm }) => rm(dir, { recursive: true, force: true }))
    })
  )
})

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

  it("extracts set data from page props", async () => {
    const pageProps = JSON.parse(await readFile(fixturePath, "utf8"))
    const set = extractSetDataFromPageProps(pageProps, {
      slug: "core-line-free",
      packageName: "@streamline-pkg/core-line-free",
      setPageUrl: "https://www.streamlinehq.com/icons/core-line-free",
      family: "Core",
      style: "line",
      license: "CC BY 4.0",
      attributionUrl: "https://www.streamlinehq.com/",
      enabled: true,
    })

    expect(set.iconCount).toBe(2)
    expect(set.icons[0]?.name).toBe("add-1")
    expect(set.icons[0]?.categorySlug).toBe("interface-essential")
    expect(set.icons[0]?.svg).toContain("currentColor")
  })

  it("writes a pack directory with manifest and icons", async () => {
    const pageProps = JSON.parse(await readFile(fixturePath, "utf8"))
    const set = extractSetDataFromPageProps(pageProps, {
      slug: "core-line-free",
      packageName: "@streamline-pkg/core-line-free",
      setPageUrl: "https://www.streamlinehq.com/icons/core-line-free",
      family: "Core",
      style: "line",
      license: "CC BY 4.0",
      attributionUrl: "https://www.streamlinehq.com/",
      enabled: true,
    })
    const tempDir = await mkdtemp(path.join(tmpdir(), "streamline-builder-"))
    tempDirs.push(tempDir)
    await writeFile(path.join(tempDir, "LICENSE"), await readFile(path.join(rootFixture, "LICENSE"), "utf8"), "utf8")

    await writePack(tempDir, set)

    const manifest = JSON.parse(
      await readFile(path.join(tempDir, "packages", "packs", "core-line-free", "manifest.json"), "utf8")
    ) as { iconCount: number; icons: Array<{ file: string }> }

    expect(manifest.iconCount).toBe(2)
    expect(manifest.icons[0]?.file).toBe("icons/add-1.svg")
    expect(
      await readFile(path.join(tempDir, "packages", "packs", "core-line-free", "icons", "add-1.svg"), "utf8")
    ).toContain("currentColor")
    expect(await readFile(path.join(rootFixture, "LICENSE"), "utf8")).toContain("MIT License")
  })
})
