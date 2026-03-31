import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"

import type { ExtractedSetData, PackManifest } from "./types"

export async function writePack(rootDir: string, set: ExtractedSetData): Promise<void> {
  const packDir = path.join(rootDir, "packages", "packs", set.slug)
  const iconsDir = path.join(packDir, "icons")

  await rm(packDir, { recursive: true, force: true })
  await mkdir(iconsDir, { recursive: true })

  const manifest: PackManifest = {
    name: set.packageName,
    slug: set.slug,
    version: "0.1.0",
    license: set.license,
    sourceUrl: set.sourceUrl,
    family: set.family,
    style: set.style,
    iconCount: set.iconCount,
    icons: set.icons.map((icon) => ({
      name: icon.name,
      file: `icons/${icon.file}`,
      originalName: icon.originalName,
      sourcePageUrl: icon.sourcePageUrl,
      category: icon.category,
      categorySlug: icon.categorySlug,
      subcategory: icon.subcategory,
      subcategorySlug: icon.subcategorySlug,
      tags: icon.tags,
    })),
  }

  for (const icon of set.icons) {
    await writeFile(path.join(iconsDir, icon.file), `${icon.svg}\n`, "utf8")
  }

  await writeJson(path.join(packDir, "manifest.json"), manifest)
  await writeFile(path.join(packDir, "README.md"), renderPackReadme(set), "utf8")
  await writeFile(path.join(packDir, "ATTRIBUTION.md"), renderAttribution(set), "utf8")
  await writeFile(path.join(packDir, "LICENSE"), await readRootLicense(rootDir), "utf8")
  await writeJson(path.join(packDir, "package.json"), {
    name: set.packageName,
    version: "0.1.0",
    description: `Redistributed Streamline ${set.familyName} icon pack`,
    license: set.license,
    type: "module",
    files: ["manifest.json", "icons", "README.md", "ATTRIBUTION.md", "LICENSE"],
    exports: {
      "./manifest.json": "./manifest.json",
      "./icons/*": "./icons/*",
    },
    keywords: ["streamline", "icons", "svg", "cc-by-4.0"],
  })
}

async function readRootLicense(rootDir: string): Promise<string> {
  return readFile(path.join(rootDir, "LICENSE"), "utf8")
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8")
}

function renderPackReadme(set: ExtractedSetData): string {
  return `# ${set.packageName}

Redistributed Streamline pack for ${set.familyName}.

- Family: ${set.family}
- Style: ${set.style}
- Icons: ${set.iconCount}
- Source: ${set.sourceUrl}
- License: ${set.license}

This package contains \`manifest.json\` plus flat \`icons/*.svg\` files for downstream tooling.
`
}

function renderAttribution(set: ExtractedSetData): string {
  return `# Attribution

This package redistributes icons from Streamline.

- Set: ${set.familyName}
- Source: ${set.sourceUrl}
- Attribution: ${set.attributionUrl}
- License: ${set.license}

Please verify your downstream attribution requirements before redistribution.
`
}
