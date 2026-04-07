import { mkdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"

import {
  PACK_MANIFEST_LICENSE,
  PACK_OSS_HOMEPAGE_URL,
  PACK_REDISTRIBUTOR,
  PACK_REDISTRIBUTOR_COPYRIGHT,
  getSharedReleaseVersion,
} from "./release"
import { createPackPackageJson, renderPackIndexHtml, renderPackReadme, type PackRenderData } from "./gallery"
import { getSvgGridSize } from "./svg"
import type { ExtractedSetData, PackManifest } from "./types"

export async function writePack(rootDir: string, set: ExtractedSetData): Promise<void> {
  const packDir = path.join(rootDir, "packages", "packs", set.slug)
  const iconsDir = path.join(packDir, "icons")
  const releaseVersion = await getSharedReleaseVersion(rootDir)

  await rm(packDir, { recursive: true, force: true })
  await mkdir(iconsDir, { recursive: true })

  const manifest: PackManifest = {
    name: set.packageName,
    slug: set.slug,
    version: releaseVersion,
    license: PACK_MANIFEST_LICENSE,
    sourceUrl: set.sourceUrl,
    family: set.family,
    style: set.style,
    ...(set.familyDescription ? { familyDescription: set.familyDescription } : {}),
    gridSize: resolvePackGridSize(set),
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
      ...(icon.tags && icon.tags.length > 0 ? { tags: icon.tags } : {}),
    })),
  }

  for (const icon of set.icons) {
    await writeFile(path.join(iconsDir, icon.file), `${icon.svg}\n`, "utf8")
  }

  const packRenderData: PackRenderData = {
    iconCount: manifest.iconCount,
    name: manifest.name,
    slug: manifest.slug,
    version: manifest.version,
    sourceUrl: manifest.sourceUrl,
    family: manifest.family,
    style: manifest.style,
    familyDescription: manifest.familyDescription,
    gridSize: manifest.gridSize,
    icons: manifest.icons,
  }

  await writeJson(path.join(packDir, "manifest.json"), manifest)
  await writeFile(path.join(packDir, "README.md"), renderPackReadme(packRenderData), "utf8")
  await writeFile(path.join(packDir, "index.html"), renderPackIndexHtml(packRenderData), "utf8")
  await writeFile(path.join(packDir, "ATTRIBUTION.md"), renderAttribution(set), "utf8")
  await writeFile(path.join(packDir, "LICENSE"), renderLicense(set), "utf8")
  await writeJson(path.join(packDir, "package.json"), createPackPackageJson(packRenderData))
}

function resolvePackGridSize(set: ExtractedSetData): number | undefined {
  let gridSize: number | undefined

  for (const icon of set.icons) {
    const iconGridSize = getSvgGridSize(icon.svg, {
      packSlug: set.slug,
      iconName: icon.name,
    })

    if (gridSize == null) {
      gridSize = iconGridSize
      continue
    }

    if (gridSize !== iconGridSize) {
      throw new Error(`Mixed grid sizes in "${set.slug}": expected ${gridSize}, received ${iconGridSize}`)
    }
  }

  return gridSize
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8")
}

function renderAttribution(set: ExtractedSetData): string {
  return `# Attribution

This package redistributes icons from Streamline under the Creative Commons Attribution 4.0 International license.

- Set: ${set.familyName}
- Source: ${set.sourceUrl}
- Attribution: ${set.attributionUrl}
- License: ${PACK_MANIFEST_LICENSE}
- Redistributor: ${PACK_REDISTRIBUTOR_COPYRIGHT}
- OSS Home: ${PACK_OSS_HOMEPAGE_URL}

Downstream consumers are responsible for preserving the required attribution when redistributing or presenting these icons.
`
}

function renderLicense(set: ExtractedSetData): string {
  return `${PACK_REDISTRIBUTOR_COPYRIGHT}
OSS home: ${PACK_OSS_HOMEPAGE_URL}

This package redistributes Streamline icons from ${set.familyName}.

The icon assets in this package are licensed under the Creative Commons Attribution 4.0 International license (CC BY 4.0):
https://creativecommons.org/licenses/by/4.0/

Source set:
${set.sourceUrl}

Attribution source:
${set.attributionUrl}

Please review the Streamline terms and the CC BY 4.0 license requirements before redistributing these assets.
`
}
