import path from "node:path"
import { mkdir, rm } from "node:fs/promises"
import { spawn } from "node:child_process"

import { demoRoutes } from "../packages/demo-shared/src/catalog"
import { copyReleasePackArtifacts, writePagesIndex } from "./pages"

const repoRoot = process.cwd()
const outputRoot = path.join(repoRoot, "demo", "dist")

async function main(): Promise<void> {
  await rm(outputRoot, { force: true, recursive: true })

  for (const demo of demoRoutes) {
    await runPnpm(["--filter", demo.workspace, "build"])
  }

  await mkdir(outputRoot, { recursive: true })
  await copyReleasePackArtifacts(repoRoot, outputRoot)
  await writePagesIndex(repoRoot, outputRoot)
}

function runPnpm(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm"
    const child = spawn(command, args, {
      cwd: repoRoot,
      stdio: "inherit",
    })

    child.on("exit", (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`pnpm ${args.join(" ")} exited with code ${code ?? "unknown"}`))
    })

    child.on("error", reject)
  })
}

void main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
