import path from "node:path"

import { describe, expect, it } from "vitest"
import { build } from "vite"

type DemoApp = "image" | "mask" | "inline-svg" | "web-component"

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
const configFiles: Record<DemoApp, string> = {
  image: path.join(repoRoot, "packages", "demo-image", "vite.config.ts"),
  mask: path.join(repoRoot, "packages", "demo-mask", "vite.config.ts"),
  "inline-svg": path.join(repoRoot, "packages", "demo-inline-svg", "vite.config.ts"),
  "web-component": path.join(repoRoot, "packages", "demo-web-component", "vite.config.ts"),
}

describe.sequential("workspace demo builds", () => {
  it("builds the image app", async () => {
    const code = collectChunkCode(await buildDemo("image"))

    expect(code).toContain("JSX image output")
    expect(code).toContain("../mask/")
    expect(code).toContain('"img"')
    expect(code).toContain("?url")
  })

  it("builds the mask app", async () => {
    const code = collectChunkCode(await buildDemo("mask"))

    expect(code).toContain("JSX mask output")
    expect(code).toContain("../image/")
    expect(code).toContain("buildStreamlineMaskStyle")
    expect(code).toContain('"span"')
  })

  it("builds the inline-svg app", async () => {
    const code = collectChunkCode(await buildDemo("inline-svg"))

    expect(code).toContain("JSX inline SVG output")
    expect(code).toContain("../image/")
    expect(code).toContain('"svg"')
    expect(code).not.toContain('new URL("airplane')
  })

  it("builds the web-component app", async () => {
    const code = collectChunkCode(await buildDemo("web-component"))

    expect(code).toContain("Web component output")
    expect(code).toContain("../image/")
    expect(code).toContain("streamline-icon")
    expect(code).toContain("data-streamline-url")
    expect(code).toContain("ensureStreamlineIconElement")
  })
})

async function buildDemo(app: DemoApp): Promise<BuildOutput[]> {
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

function isOutputChunk(chunk: BuildOutput["output"][number]): chunk is BuildChunk {
  return chunk.type === "chunk"
}

function isBuildOutput(value: unknown): value is BuildOutput {
  return typeof value === "object" && value != null && "output" in value && Array.isArray(value.output)
}
