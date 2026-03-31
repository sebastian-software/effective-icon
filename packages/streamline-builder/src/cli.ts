import { downloadAllPacks, downloadSinglePack, resolveWorkspaceRoot } from "./downloader"
import { validatePacks } from "./validate"

async function main() {
  const [command, slug] = process.argv.slice(2)
  const rootDir = resolveWorkspaceRoot(import.meta.dirname)

  switch (command) {
    case "download-all":
      await downloadAllPacks(rootDir)
      return
    case "download-set":
      if (!slug) {
        throw new Error("Missing slug for download-set <slug>")
      }
      await downloadSinglePack(rootDir, slug)
      return
    case "validate-packs":
      await validatePacks(rootDir)
      return
    default:
      throw new Error(`Unsupported command "${command ?? ""}"`)
  }
}

void main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
