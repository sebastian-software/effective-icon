import path from "node:path"

import { collectIconsFromDirectory, resolveStyleDir } from "./common"
import type {
  DirectorySourceOptions,
  ProviderContext,
  ResolvedIconSet,
  StreamlineIconStyle,
} from "../types"

export async function resolveDirectoryIconSet(
  options: DirectorySourceOptions,
  style: StreamlineIconStyle,
  context: ProviderContext
): Promise<ResolvedIconSet> {
  const sourcePath = path.resolve(context.root, options.path)
  return collectIconsFromDirectory(resolveStyleDir(sourcePath, style), style, "directory")
}
