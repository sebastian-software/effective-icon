import { readFile } from "node:fs/promises"
import { spawn } from "node:child_process"
import { tmpdir } from "node:os"
import path from "node:path"

import { findRegistryEntry } from "./registry"

export const PACK_PACKAGE_LICENSE = "CC-BY-4.0"
export const PACK_MANIFEST_LICENSE = "CC BY 4.0"
export const PACK_REPOSITORY_URL = "https://github.com/sebastian-software/effective-icon"
export const PACK_REPOSITORY_GIT_URL = "git+https://github.com/sebastian-software/effective-icon.git"
export const PACK_PAGES_URL = "https://sebastian-software.github.io/effective-icon"
export const PACK_HOMEPAGE_URL = `${PACK_PAGES_URL}/`
export const PACK_BUGS_URL = `${PACK_REPOSITORY_URL}/issues`
export const PACK_OSS_HOMEPAGE_URL = "https://oss.sebastian-software.com"
export const PACK_REDISTRIBUTOR = "Sebastian Software GmbH, Mainz, Germany"
export const PACK_REDISTRIBUTOR_COPYRIGHT = "Copyright (c) 2026 Sebastian Software GmbH, Mainz, Germany"

export const RELEASE_PACK_SLUGS = [
  "core-line-free",
  "core-solid-free",
  "core-remix-free",
  "flex-line-free",
  "flex-solid-free",
  "flex-remix-free",
  "sharp-line-free",
  "sharp-solid-free",
  "sharp-remix-free",
  "plump-line-free",
  "plump-solid-free",
  "plump-remix-free",
  "material-pro-outlined-fill-free",
  "material-pro-outlined-line-free",
  "material-pro-rounded-fill-free",
  "material-pro-rounded-line-free",
  "material-pro-sharp-fill-free",
  "material-pro-sharp-line-free",
  "ultimate-light-free",
  "ultimate-regular-free",
  "ultimate-bold-free",
] as const

export function getReleaseRegistryEntries() {
  return RELEASE_PACK_SLUGS.map((slug) => findRegistryEntry(slug))
}

export function getPackDir(rootDir: string, slug: string): string {
  return path.join(rootDir, "packages", "packs", slug)
}

export function getPackGalleryUrl(slug: string): string {
  return `${PACK_PAGES_URL}/packs/${slug}/`
}

export async function getSharedReleaseVersion(rootDir: string): Promise<string> {
  const packageJsonPath = path.join(rootDir, "package.json")
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as { version?: unknown }

  if (typeof packageJson.version !== "string" || packageJson.version.length === 0) {
    throw new Error(`Root package at "${packageJsonPath}" is missing a valid version`)
  }

  return packageJson.version
}

export async function runCommand(command: string, args: string[], cwd: string): Promise<void> {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    npm_config_cache: path.join(tmpdir(), "streamline-pkg-npm-cache"),
  }
  delete env.npm_config_recursive

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      env,
    })

    child.on("error", reject)
    child.on("exit", (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`Command "${command} ${args.join(" ")}" failed with exit code ${code ?? "unknown"}`))
    })
  })
}
