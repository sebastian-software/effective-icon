import { readdir } from "node:fs/promises"
import path from "node:path"

import { isIconFile, normalizeIconName } from "../manifest"
import type { ResolvedIconSet, StreamlineIconAsset, StreamlineIconStyle } from "../types"

export async function collectIconsFromDirectory(
  dirPath: string,
  style: StreamlineIconStyle,
  origin: StreamlineIconAsset["origin"]
): Promise<ResolvedIconSet> {
  const entries = await readdir(dirPath, { withFileTypes: true })
  const icons = new Map<string, StreamlineIconAsset>()

  for (const entry of entries) {
    if (!entry.isFile() || !isIconFile(entry.name)) {
      continue
    }

    const name = normalizeIconName(entry.name)
    icons.set(name, {
      name,
      style,
      origin,
      path: path.join(dirPath, entry.name),
    })
  }

  return { style, icons }
}

export function resolveStyleDir(basePath: string, style: StreamlineIconStyle): string {
  return path.join(basePath, style)
}
