import { downloadAllPacks, downloadSinglePack, resolveWorkspaceRoot } from "./downloader"
import { getReleaseRegistryEntries, runCommand } from "./release"
import { validatePacks, validateReleasePacks } from "./validate"

async function main() {
  const [command, slug] = process.argv.slice(2).filter((argument) => argument !== "--")
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
    case "release-check":
      await validateReleasePacks(rootDir)
      return
    case "publish-release":
      await validateReleasePacks(rootDir)
      await runCommand("npm", ["whoami"], rootDir)

      for (const entry of getReleaseRegistryEntries()) {
        await runCommand("npm", ["publish", "--access", "public"], `${rootDir}/packages/packs/${entry.slug}`)
      }
      return
    default:
      throw new Error(`Unsupported command "${command ?? ""}"`)
  }
}

void main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
