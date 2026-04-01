import { access, readdir, readFile } from "node:fs/promises"
import { createRequire } from "node:module"
import path from "node:path"

import type { IconPackManifest, IconPackManifestIcon } from "./types"

export interface ResolvedPackIcon extends IconPackManifestIcon {
  absolutePath: string
}

export interface ResolvedIconPackage {
  manifest: IconPackManifest
  manifestPath: string
  packageDir: string
  packageName: string
  iconsByName: Map<string, ResolvedPackIcon>
}

export async function resolveIconPackage(packageName: string, root: string): Promise<ResolvedIconPackage> {
  const manifestPath = await resolveManifestPath(packageName, root)
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as IconPackManifest
  const packageDir = path.dirname(manifestPath)

  if (manifest.name !== packageName) {
    throw new Error(`Manifest "${manifestPath}" declares "${manifest.name}", expected "${packageName}"`)
  }

  if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
    throw new Error(`Manifest "${manifestPath}" does not declare any icons`)
  }

  const iconsByName = new Map<string, ResolvedPackIcon>()

  for (const icon of manifest.icons) {
    if (typeof icon.name !== "string" || typeof icon.file !== "string") {
      throw new Error(`Manifest "${manifestPath}" contains an invalid icon entry`)
    }

    const absolutePath = path.resolve(packageDir, icon.file)
    await access(absolutePath)

    if (iconsByName.has(icon.name)) {
      throw new Error(`Manifest "${manifestPath}" contains duplicate icon name "${icon.name}"`)
    }

    iconsByName.set(icon.name, { ...icon, absolutePath })
  }

  return {
    manifest,
    manifestPath,
    packageDir,
    packageName,
    iconsByName,
  }
}

async function resolveManifestPath(packageName: string, root: string): Promise<string> {
  const fromNodeResolution = resolveFromNodeModules(packageName, root)
  if (fromNodeResolution) {
    return fromNodeResolution
  }

  const fromWorkspace = await resolveFromWorkspace(packageName, root)
  if (fromWorkspace) {
    return fromWorkspace
  }

  throw new Error(`Unable to resolve manifest for "${packageName}" from "${root}"`)
}

function resolveFromNodeModules(packageName: string, root: string): string | null {
  try {
    const requireFromRoot = createRequire(path.join(root, "package.json"))
    return requireFromRoot.resolve(`${packageName}/manifest.json`)
  } catch {
    return null
  }
}

async function resolveFromWorkspace(packageName: string, startDir: string): Promise<string | null> {
  let current = path.resolve(startDir)

  while (true) {
    const packsDir = path.join(current, "packages", "packs")
    const packageDir = await findMatchingPackDir(packsDir, packageName)
    if (packageDir) {
      return path.join(packageDir, "manifest.json")
    }

    const parent = path.dirname(current)
    if (parent === current) {
      return null
    }
    current = parent
  }
}

async function findMatchingPackDir(packsDir: string, packageName: string): Promise<string | null> {
  try {
    const entries = await readdir(packsDir, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue
      }

      const candidateDir = path.join(packsDir, entry.name)
      const packageJsonPath = path.join(candidateDir, "package.json")

      try {
        const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as { name?: string }
        if (packageJson.name === packageName) {
          return candidateDir
        }
      } catch {
        continue
      }
    }
  } catch {
    return null
  }

  return null
}
