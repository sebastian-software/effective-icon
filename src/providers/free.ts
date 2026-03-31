import path from "node:path"
import { fileURLToPath } from "node:url"

import { collectIconsFromDirectory, resolveStyleDir } from "./common"
import type { FreeSourceOptions, ProviderContext, ResolvedIconSet, StreamlineIconStyle } from "../types"

const defaultAssetsDir = fileURLToPath(new URL("../../assets/free", import.meta.url))

export async function resolveFreeIconSet(
  options: FreeSourceOptions,
  style: StreamlineIconStyle,
  _context: ProviderContext
): Promise<ResolvedIconSet> {
  const assetsDir = options.assetsDir ?? path.resolve(defaultAssetsDir)
  return collectIconsFromDirectory(resolveStyleDir(assetsDir, style), style, "free")
}
