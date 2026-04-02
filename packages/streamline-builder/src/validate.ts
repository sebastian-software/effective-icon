import { access, readFile } from "node:fs/promises"
import path from "node:path"

import { getEnabledRegistry } from "./registry"
import {
  getPackDir,
  getReleaseRegistryEntries,
  PACK_BUGS_URL,
  PACK_HOMEPAGE_URL,
  PACK_MANIFEST_LICENSE,
  PACK_PACKAGE_LICENSE,
  PACK_RELEASE_VERSION,
  PACK_REPOSITORY_GIT_URL,
  runCommand,
} from "./release"
import { validatePackSvg } from "./svg"
import type { RegistryEntry } from "./types"

interface PackState {
  entry: RegistryEntry
  packDir: string
  manifest: {
    name?: string
    slug?: string
    version?: string
    license?: string
    icons?: Array<{ file?: string; tags?: string[] }>
  }
  packageJson: {
    name?: string
    version?: string
    license?: string
    files?: string[]
    exports?: Record<string, string>
    publishConfig?: { access?: string }
    repository?: { type?: string; url?: string; directory?: string }
    homepage?: string
    bugs?: { url?: string }
  }
}

export async function validatePacks(rootDir: string): Promise<void> {
  for (const entry of getEnabledRegistry()) {
    const pack = await loadPackState(rootDir, entry)
    assertPackStructure(pack)
  }
}

export async function validateReleasePacks(rootDir: string): Promise<void> {
  for (const entry of getReleaseRegistryEntries()) {
    const pack = await loadPackState(rootDir, entry)
    assertPackStructure(pack)
    assertReleaseMetadata(pack)
    await runCommand("npm", ["pack", "--dry-run", "--json"], pack.packDir)
  }
}

async function loadPackState(rootDir: string, entry: RegistryEntry): Promise<PackState> {
  const packDir = getPackDir(rootDir, entry.slug)
  const manifestPath = path.join(packDir, "manifest.json")
  const packageJsonPath = path.join(packDir, "package.json")
  const attributionPath = path.join(packDir, "ATTRIBUTION.md")
  const readmePath = path.join(packDir, "README.md")
  const licensePath = path.join(packDir, "LICENSE")

  await Promise.all([
    assertExists(manifestPath),
    assertExists(packageJsonPath),
    assertExists(attributionPath),
    assertExists(readmePath),
    assertExists(licensePath),
  ])

  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as PackState["manifest"]
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as PackState["packageJson"]

  const icons = manifest.icons ?? []
  for (const icon of icons) {
    if (!icon.file) {
      throw new Error(`Pack "${entry.slug}" has an icon entry without a file`)
    }
    const iconPath = path.join(packDir, icon.file)
    await assertExists(iconPath)
    const iconName = path.basename(icon.file, ".svg")
    validatePackSvg(await readFile(iconPath, "utf8"), {
      packSlug: entry.slug,
      iconName,
    })
  }

  return {
    entry,
    packDir,
    manifest,
    packageJson,
  }
}

function assertPackStructure(pack: PackState): void {
  const { entry, manifest, packageJson } = pack

  if (manifest.name !== entry.packageName) {
    throw new Error(`Pack "${entry.slug}" has unexpected package name "${manifest.name}"`)
  }
  if (manifest.slug !== entry.slug) {
    throw new Error(`Pack "${entry.slug}" has unexpected slug "${manifest.slug}"`)
  }
  if (manifest.license !== entry.license) {
    throw new Error(`Pack "${entry.slug}" has unexpected license "${manifest.license}"`)
  }
  if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
    throw new Error(`Pack "${entry.slug}" has no icons in manifest`)
  }
  if (packageJson.exports?.["./manifest.json"] !== "./manifest.json") {
    throw new Error(`Pack "${entry.slug}" does not export "./manifest.json" correctly`)
  }
  if (packageJson.exports?.["./icons/*"] !== "./icons/*") {
    throw new Error(`Pack "${entry.slug}" does not export "./icons/*" correctly`)
  }

  for (const icon of manifest.icons) {
    if (icon.tags != null && !Array.isArray(icon.tags)) {
      throw new Error(`Pack "${entry.slug}" has a non-array tags field`)
    }
  }
}

function assertReleaseMetadata(pack: PackState): void {
  const { entry, manifest, packageJson } = pack

  if (manifest.version !== PACK_RELEASE_VERSION) {
    throw new Error(`Pack "${entry.slug}" has unexpected manifest version "${manifest.version}"`)
  }
  if (manifest.license !== PACK_MANIFEST_LICENSE) {
    throw new Error(`Pack "${entry.slug}" has unexpected manifest license "${manifest.license}"`)
  }
  if (packageJson.name !== entry.packageName) {
    throw new Error(`Pack "${entry.slug}" has unexpected package name "${packageJson.name}"`)
  }
  if (packageJson.version !== PACK_RELEASE_VERSION) {
    throw new Error(`Pack "${entry.slug}" has unexpected package version "${packageJson.version}"`)
  }
  if (packageJson.license !== PACK_PACKAGE_LICENSE) {
    throw new Error(`Pack "${entry.slug}" has unexpected package license "${packageJson.license}"`)
  }
  if (packageJson.publishConfig?.access !== "public") {
    throw new Error(`Pack "${entry.slug}" must publish with public access`)
  }
  if (packageJson.repository?.type !== "git") {
    throw new Error(`Pack "${entry.slug}" has unexpected repository type "${packageJson.repository?.type}"`)
  }
  if (packageJson.repository?.url !== PACK_REPOSITORY_GIT_URL) {
    throw new Error(`Pack "${entry.slug}" has unexpected repository url "${packageJson.repository?.url}"`)
  }
  if (packageJson.repository?.directory !== `packages/packs/${entry.slug}`) {
    throw new Error(`Pack "${entry.slug}" has unexpected repository directory "${packageJson.repository?.directory}"`)
  }
  if (packageJson.homepage !== PACK_HOMEPAGE_URL) {
    throw new Error(`Pack "${entry.slug}" has unexpected homepage "${packageJson.homepage}"`)
  }
  if (packageJson.bugs?.url !== PACK_BUGS_URL) {
    throw new Error(`Pack "${entry.slug}" has unexpected bugs url "${packageJson.bugs?.url}"`)
  }

  const expectedFiles = ["manifest.json", "icons", "README.md", "ATTRIBUTION.md", "LICENSE"]
  for (const file of expectedFiles) {
    if (!packageJson.files?.includes(file)) {
      throw new Error(`Pack "${entry.slug}" is missing "${file}" from package files`)
    }
  }
}

async function assertExists(filePath: string): Promise<void> {
  await access(filePath)
}
