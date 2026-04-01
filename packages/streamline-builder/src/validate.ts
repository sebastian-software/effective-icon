import { access, readFile } from "node:fs/promises"
import path from "node:path"

import { getEnabledRegistry } from "./registry"

export async function validatePacks(rootDir: string): Promise<void> {
  for (const entry of getEnabledRegistry()) {
    const packDir = path.join(rootDir, "packages", "packs", entry.slug)
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

    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
      name?: string
      slug?: string
      license?: string
      icons?: Array<{ file?: string; tags?: string[] }>
    }
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
      exports?: Record<string, string>
    }

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
      if (!icon.file) {
        throw new Error(`Pack "${entry.slug}" has an icon entry without a file`)
      }
      if (icon.tags != null && !Array.isArray(icon.tags)) {
        throw new Error(`Pack "${entry.slug}" has a non-array tags field`)
      }
      await assertExists(path.join(packDir, icon.file))
    }
  }
}

async function assertExists(filePath: string): Promise<void> {
  await access(filePath)
}
