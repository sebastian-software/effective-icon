import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"
import { build } from "vite"

const fixtureAppRoot = path.resolve(process.cwd(), "fixtures/vite-app")

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

describe.sequential("vite consumer integration", () => {
  afterEach(() => {
    delete process.env.STREAMLINE_SURFACE
    delete process.env.STREAMLINE_RENDER_MODE
  })

  it("builds the fixture app for image mode and includes only referenced icons", async () => {
    process.env.STREAMLINE_SURFACE = "jsx"
    process.env.STREAMLINE_RENDER_MODE = "image"

    const outputs = await buildFixtureApp()
    const code = collectChunkCode(outputs)

    expect(code).toContain("icon--airplane")
    expect(code).toContain('"img"')
    expect(code).not.toContain("anchor")
  })

  it("builds the fixture app for svg mode", async () => {
    process.env.STREAMLINE_SURFACE = "jsx"
    process.env.STREAMLINE_RENDER_MODE = "svg"

    const outputs = await buildFixtureApp()
    const code = collectChunkCode(outputs)

    expect(code).toContain('"svg"')
    expect(code).not.toContain("?url")
    expect(code).not.toContain("anchor")
  })

  it("builds the fixture app for mask mode", async () => {
    process.env.STREAMLINE_SURFACE = "jsx"
    process.env.STREAMLINE_RENDER_MODE = "mask"

    const outputs = await buildFixtureApp()
    const code = collectChunkCode(outputs)
    const assets = collectAssetText(outputs)

    expect(assets).toContain(".effective-icon-mask")
    expect(code).toContain("effective-icon-mask")
    expect(code).toContain("--effective-icon-mask-image")
    expect(code).not.toContain("buildIconMaskStyle")
    expect(code).not.toContain("anchor")
  })
})

async function buildFixtureApp(): Promise<BuildOutput[]> {
  const result = await build({
    root: fixtureAppRoot,
    configFile: path.join(fixtureAppRoot, "vite.config.ts"),
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
    throw new Error("Expected Vite build to return output chunks")
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
