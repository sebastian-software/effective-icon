import path from "node:path"

import { describe, expect, it } from "vitest"
import { build } from "vite"

import type { DemoKey } from "../packages/demo-shared/src/catalog"

interface BuildChunk {
  code: string
  fileName: string
  isEntry: boolean
  type: "chunk"
}

interface BuildAsset {
  fileName: string
  source: string | Uint8Array
  type: "asset"
}

interface BuildOutput {
  output: Array<BuildAsset | BuildChunk>
}

const repoRoot = path.resolve(process.cwd())
const configFiles: Record<DemoKey, string> = {
  "react-image": path.join(repoRoot, "packages", "demo-react-image", "vite.config.ts"),
  "react-mask": path.join(repoRoot, "packages", "demo-react-mask", "vite.config.ts"),
  "react-svg": path.join(repoRoot, "packages", "demo-react-svg", "vite.config.ts"),
  "solid-image": path.join(repoRoot, "packages", "demo-solid-image", "vite.config.ts"),
  "solid-mask": path.join(repoRoot, "packages", "demo-solid-mask", "vite.config.ts"),
  "solid-svg": path.join(repoRoot, "packages", "demo-solid", "vite.config.ts"),
}

describe.sequential("workspace demo builds", () => {
  for (const demo of Object.keys(configFiles) as DemoKey[]) {
    it(`builds the ${demo} app`, async () => {
      const outputs = await buildDemo(demo)
      const code = collectChunkCode(outputs)
      const assets = collectAssetText(outputs)

      expect(code).toContain("Framework demos")
      expect(code).toContain("React")
      expect(code).toContain("Solid")
      expect(code).not.toContain("Inline usage")

      if (demo.startsWith("react-")) {
        expect(code).toContain("React /")
        expect(code).toContain("createRoot")
      }

      if (demo.startsWith("solid-")) {
        expect(code).toContain("Solid /")
        expect(code).toContain("solid-js/web")
      }

      if (demo.endsWith("image")) {
        expect(code).toContain("?url")
        expect(code.includes("<img") || code.includes('"img"')).toBe(true)
      }

      if (demo.endsWith("mask")) {
        expect(assets).toContain(".effective-icon-mask")
        expect(code).toContain("effective-icon-mask")
        expect(code).toContain("--effective-icon-mask-image")
        expect(code).not.toContain("buildIconMaskStyle")
        expect(code).not.toContain("buildIconMaskStyleString")
        expect(code).toContain('"span"')
      }

      if (demo.endsWith("svg")) {
        expect(code).toContain("<svg")
        expect(code).not.toContain('new URL("airplane')
      }
    })
  }
})

async function buildDemo(app: DemoKey): Promise<BuildOutput[]> {
  const result = await build({
    configFile: configFiles[app],
    logLevel: "silent",
    build: {
      minify: false,
      write: false,
    },
  })

  const outputs: BuildOutput[] = []

  for (const candidate of Array.isArray(result) ? (result as unknown[]) : [result as unknown]) {
    if (isBuildOutput(candidate)) {
      outputs.push(candidate)
    }
  }

  if (outputs.length === 0) {
    throw new Error(`Expected build output for ${app}`)
  }

  return outputs
}

function collectChunkCode(outputs: BuildOutput[]): string {
  return outputs
    .flatMap((output) => output.output)
    .filter(isOutputChunk)
    .map((chunk) => chunk.code)
    .join("\n")
}

function collectAssetText(outputs: BuildOutput[]): string {
  return outputs
    .flatMap((output) => output.output)
    .filter((asset): asset is BuildAsset => asset.type === "asset")
    .map((asset) => (typeof asset.source === "string" ? asset.source : Buffer.from(asset.source).toString("utf8")))
    .join("\n")
}

function isOutputChunk(chunk: BuildOutput["output"][number]): chunk is BuildChunk {
  return chunk.type === "chunk"
}

function isBuildOutput(value: unknown): value is BuildOutput {
  return typeof value === "object" && value != null && "output" in value && Array.isArray(value.output)
}
