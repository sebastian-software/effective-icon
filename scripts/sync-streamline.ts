import { cp, mkdir, readdir } from "node:fs/promises"
import path from "node:path"

import { normalizeIconName } from "../src/manifest"

interface CliArgs {
  from: string
  to: string
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  for (const style of ["light", "regular", "bold"] as const) {
    const sourceDir = path.join(args.from, style)
    const targetDir = path.join(args.to, style)
    await mkdir(targetDir, { recursive: true })

    let copied = 0
    for (const entry of await readdir(sourceDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".svg")) {
        continue
      }

      const normalizedName = `${normalizeIconName(entry.name)}.svg`
      await cp(path.join(sourceDir, entry.name), path.join(targetDir, normalizedName))
      copied += 1
    }

    console.log(`[sync] ${style}: copied ${copied} icons`)
  }
}

function parseArgs(argv: string[]): CliArgs {
  const fromIndex = argv.indexOf("--from")
  const toIndex = argv.indexOf("--to")

  if (fromIndex === -1 || !argv[fromIndex + 1]) {
    throw new Error("Missing required --from <directory>")
  }

  return {
    from: path.resolve(argv[fromIndex + 1]),
    to: path.resolve(toIndex === -1 ? "assets/free" : argv[toIndex + 1]),
  }
}

void main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
