import { spawn, type ChildProcess } from "node:child_process"

import { demoRoutes } from "../packages/demo-shared/src/catalog"

const repoRoot = process.cwd()
const children: ChildProcess[] = []

async function main(): Promise<void> {
  for (const demo of demoRoutes) {
    children.push(spawnPnpm(demo.workspace, demo.slug))
  }
}

function spawnPnpm(filter: string, label: string): ChildProcess {
  const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm"
  const child = spawn(command, ["--filter", filter, "dev"], {
    cwd: repoRoot,
    stdio: "pipe",
  })

  child.stdout?.on("data", (chunk) => process.stdout.write(prefixLines(String(chunk), label)))
  child.stderr?.on("data", (chunk) => process.stderr.write(prefixLines(String(chunk), label)))

  child.on("exit", (code) => {
    if (code && code !== 0) {
      process.stderr.write(`[${label}] exited with code ${code}\n`)
    }
  })

  return child
}

function prefixLines(input: string, label: string): string {
  return input
    .split("\n")
    .map((line) => (line.length > 0 ? `[${label}] ${line}` : line))
    .join("\n")
}

function shutdown(): void {
  for (const child of children) {
    child.kill("SIGTERM")
  }
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)

void main().catch((error) => {
  console.error(error)
  shutdown()
  process.exitCode = 1
})
