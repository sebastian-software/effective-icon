import path from "node:path"

import AdmZip from "adm-zip"

import { isIconFile, normalizeIconName } from "../manifest"
import type {
  ArchiveSourceOptions,
  ProviderContext,
  ResolvedIconSet,
  StreamlineIconAsset,
  StreamlineIconStyle,
} from "../types"

export async function resolveArchiveIconSet(
  options: ArchiveSourceOptions,
  style: StreamlineIconStyle,
  context: ProviderContext
): Promise<ResolvedIconSet> {
  const archivePath = path.resolve(context.root, options.path)
  const zip = new AdmZip(archivePath)
  const icons = new Map<string, StreamlineIconAsset>()

  for (const entry of zip
    .getEntries()
    .filter((candidate) => !candidate.isDirectory)
    .sort((left, right) => left.entryName.localeCompare(right.entryName))) {
    const entryPath = entry.entryName.replaceAll("\\", "/")
    if (!entryPath.includes(`/${style}/`) && !entryPath.startsWith(`${style}/`)) {
      continue
    }
    if (!isIconFile(entryPath)) {
      continue
    }

    const basename = path.basename(entryPath)
    const normalizedName = normalizeIconName(basename)
    icons.set(normalizedName, {
      name: normalizedName,
      style,
      origin: "archive",
      svg: entry.getData().toString("utf8"),
    })
  }

  return { style, icons }
}

export async function readArchivePreview(
  options: ArchiveSourceOptions,
  context: ProviderContext
): Promise<string[]> {
  const archivePath = path.resolve(context.root, options.path)
  const zip = new AdmZip(archivePath)
  return zip
    .getEntries()
    .filter((entry) => !entry.isDirectory)
    .map((entry) => entry.entryName)
    .slice(0, 20)
}
