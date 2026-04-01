import { mkdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"

import {
  PACK_BUGS_URL,
  PACK_HOMEPAGE_URL,
  PACK_MANIFEST_LICENSE,
  PACK_OSS_HOMEPAGE_URL,
  PACK_PACKAGE_LICENSE,
  PACK_REDISTRIBUTOR,
  PACK_REDISTRIBUTOR_COPYRIGHT,
  PACK_RELEASE_VERSION,
  PACK_REPOSITORY_GIT_URL,
} from "./release"
import type { ExtractedSetData, PackManifest } from "./types"

export async function writePack(rootDir: string, set: ExtractedSetData): Promise<void> {
  const packDir = path.join(rootDir, "packages", "packs", set.slug)
  const iconsDir = path.join(packDir, "icons")

  await rm(packDir, { recursive: true, force: true })
  await mkdir(iconsDir, { recursive: true })

  const manifest: PackManifest = {
    name: set.packageName,
    slug: set.slug,
    version: PACK_RELEASE_VERSION,
    license: PACK_MANIFEST_LICENSE,
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
      ...(icon.tags && icon.tags.length > 0 ? { tags: icon.tags } : {}),
    })),
  }

  for (const icon of set.icons) {
    await writeFile(path.join(iconsDir, icon.file), `${icon.svg}\n`, "utf8")
  }

  await writeJson(path.join(packDir, "manifest.json"), manifest)
  await writeFile(path.join(packDir, "README.md"), renderPackReadme(set), "utf8")
  await writeFile(path.join(packDir, "ATTRIBUTION.md"), renderAttribution(set), "utf8")
  await writeFile(path.join(packDir, "LICENSE"), renderLicense(set), "utf8")
  await writeJson(path.join(packDir, "package.json"), {
    name: set.packageName,
    version: PACK_RELEASE_VERSION,
    description: `Redistributed Streamline ${set.familyName} icon pack`,
    license: PACK_PACKAGE_LICENSE,
    type: "module",
    files: ["manifest.json", "icons", "README.md", "ATTRIBUTION.md", "LICENSE"],
    exports: {
      "./manifest.json": "./manifest.json",
      "./icons/*": "./icons/*",
    },
    publishConfig: {
      access: "public",
    },
    repository: {
      type: "git",
      url: PACK_REPOSITORY_GIT_URL,
      directory: `packages/packs/${set.slug}`,
    },
    homepage: PACK_HOMEPAGE_URL,
    bugs: {
      url: PACK_BUGS_URL,
    },
    keywords: ["streamline", "icons", "svg", "cc-by-4.0"],
  })
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8")
}

function renderPackReadme(set: ExtractedSetData): string {
  return `# ${set.packageName}

Redistributed Streamline icon pack for ${set.familyName}.

- Family: ${set.family}
- Style: ${set.style}
- Icons: ${set.iconCount}
- Source: ${set.sourceUrl}
- License: ${PACK_MANIFEST_LICENSE}
- Redistributor: ${PACK_REDISTRIBUTOR}
- OSS Home: ${PACK_OSS_HOMEPAGE_URL}

## Install

\`\`\`bash
npm install ${set.packageName}
\`\`\`

## Contents

- \`manifest.json\` for pack metadata and icon lookup
- flat \`icons/*.svg\` files for downstream tooling and asset access

This package redistributes the publicly available Streamline free icon set and is intended to be consumed by build tools such as \`@effective/icon\`.
`
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
