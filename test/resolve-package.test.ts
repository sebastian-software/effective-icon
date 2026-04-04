import os from "node:os"
import path from "node:path"
import { mkdtemp, mkdir, writeFile } from "node:fs/promises"

import { describe, expect, it } from "vitest"

import { resolveIconPackage } from "../src/resolve-package"

const packageName = "@icon-pkg/test-pack"

describe("resolveIconPackage", () => {
  it("fails when no manifest can be resolved", async () => {
    const root = await createTempRoot()

    await expect(resolveIconPackage(packageName, root)).rejects.toThrow(/Unable to resolve manifest/)
  })

  it("fails when the manifest declares a different package name", async () => {
    const root = await createWorkspacePack({
      manifest: {
        name: "@icon-pkg/wrong-pack",
        icons: [createManifestIcon("airplane")],
      },
      files: ["airplane.svg"],
    })

    await expect(resolveIconPackage(packageName, root)).rejects.toThrow(/declares "@icon-pkg\/wrong-pack"/)
  })

  it("fails when the manifest contains duplicate icon names", async () => {
    const root = await createWorkspacePack({
      manifest: {
        name: packageName,
        icons: [createManifestIcon("airplane"), createManifestIcon("airplane", "airplane-2.svg")],
      },
      files: ["airplane.svg", "airplane-2.svg"],
    })

    await expect(resolveIconPackage(packageName, root)).rejects.toThrow(/duplicate icon name "airplane"/)
  })

  it("fails when a referenced icon file is missing", async () => {
    const root = await createWorkspacePack({
      manifest: {
        name: packageName,
        icons: [createManifestIcon("airplane")],
      },
      files: [],
    })

    await expect(resolveIconPackage(packageName, root)).rejects.toThrow()
  })

  it("fails when the manifest contains an invalid icon entry", async () => {
    const root = await createWorkspacePack({
      manifest: {
        name: packageName,
        icons: [{ ...createManifestIcon("airplane"), file: 42 }],
      },
      files: ["airplane.svg"],
    })

    await expect(resolveIconPackage(packageName, root)).rejects.toThrow(/invalid icon entry/)
  })
})

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "effective-icon-resolve-"))
  await writeFile(path.join(root, "package.json"), JSON.stringify({ name: "fixture-root", private: true }, null, 2))
  return root
}

async function createWorkspacePack(options: {
  manifest: {
    name: string
    icons: Array<Record<string, unknown>>
  }
  files: string[]
}): Promise<string> {
  const root = await createTempRoot()
  const packDir = path.join(root, "packages", "packs", "test-pack")
  await mkdir(packDir, { recursive: true })

  await writeFile(path.join(packDir, "package.json"), JSON.stringify({ name: packageName, private: true }, null, 2))
  await writeFile(
    path.join(packDir, "manifest.json"),
    JSON.stringify(
      {
        name: options.manifest.name,
        slug: "test-pack",
        version: "0.0.0",
        license: "MIT",
        sourceUrl: "https://example.com",
        family: "Test",
        style: "line",
        iconCount: options.manifest.icons.length,
        icons: options.manifest.icons,
      },
      null,
      2
    )
  )

  for (const file of options.files) {
    await writeFile(path.join(packDir, file), '<svg xmlns="http://www.w3.org/2000/svg"></svg>')
  }

  return root
}

function createManifestIcon(name: string, file = `${name}.svg`) {
  return {
    name,
    file,
    originalName: name,
    sourcePageUrl: "https://example.com/icon",
    category: "General",
    categorySlug: "general",
    subcategory: "General",
    subcategorySlug: "general",
    tags: [name],
  }
}
