import { createServer } from "node:http"
import { readFile } from "node:fs/promises"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"
import { build } from "vite"

const fixtureAppRoot = path.resolve(process.cwd(), "fixtures/vite-app")
const apiFixtureRoot = path.resolve(process.cwd(), "fixtures/api")
const fixtureToken = "Bearer fixture-token"

interface BuildChunk {
  code: string
  fileName: string
  isEntry: boolean
  type: "chunk"
}

interface BuildAsset {
  fileName: string
  type: "asset"
}

interface BuildOutput {
  output: Array<BuildAsset | BuildChunk>
}

describe.sequential("vite consumer integration", () => {
  afterEach(() => {
    delete process.env.STREAMLINE_SOURCE_MODE
    delete process.env.STREAMLINE_FIXTURE_BASE_URL
    delete process.env.STREAMLINE_FIXTURE_TOKEN
  })

  it("builds the fixture app with built-in free icons and keeps icon payloads lazy", async () => {
    process.env.STREAMLINE_SOURCE_MODE = "free"

    const outputs = await buildFixtureApp()

    assertLazyIconChunks(outputs)
    expect(findSvgChunks(outputs).some((chunk) => chunk.code.includes("rocket"))).toBe(true)
  })

  it("builds the fixture app with api icons via a local manifest server", async () => {
    const server = await startFixtureServer()
    process.env.STREAMLINE_SOURCE_MODE = "api"
    process.env.STREAMLINE_FIXTURE_BASE_URL = server.baseUrl
    process.env.STREAMLINE_FIXTURE_TOKEN = fixtureToken

    try {
      const outputs = await buildFixtureApp()

      assertLazyIconChunks(outputs)
      expect(server.requests).toEqual([
        { path: "/manifest.json", authorization: fixtureToken },
        { path: "/icons/regular/rocket.svg", authorization: fixtureToken },
        { path: "/icons/regular/search.svg", authorization: fixtureToken },
      ])
      expect(findSvgChunks(outputs).some((chunk) => chunk.code.includes("currentColor"))).toBe(true)
    } finally {
      await server.close()
    }
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

function assertLazyIconChunks(outputs: BuildOutput[]): void {
  const jsChunks = outputs.flatMap((output) => output.output).filter(isOutputChunk)
  const entryChunk = jsChunks.find((chunk) => chunk.isEntry)
  const svgChunks = findSvgChunks(outputs)

  expect(entryChunk).toBeDefined()
  expect(entryChunk?.code).not.toContain("<svg")
  expect(svgChunks.length).toBeGreaterThan(0)
}

function findSvgChunks(outputs: BuildOutput[]): BuildChunk[] {
  return outputs
    .flatMap((output) => output.output)
    .filter(isOutputChunk)
    .filter((chunk) => !chunk.isEntry && chunk.code.includes("<svg"))
}

function isOutputChunk(chunk: BuildOutput["output"][number]): chunk is BuildChunk {
  return chunk.type === "chunk"
}

function isBuildOutput(value: unknown): value is BuildOutput {
  return typeof value === "object" && value != null && "output" in value && Array.isArray(value.output)
}

async function startFixtureServer(): Promise<{
  baseUrl: string
  close: () => Promise<void>
  requests: Array<{ path: string; authorization?: string }>
}> {
  const requests: Array<{ path: string; authorization?: string }> = []

  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host}`)
    const authorization = request.headers.authorization
    requests.push({ path: url.pathname, authorization })

    if (authorization !== fixtureToken) {
      response.writeHead(401, { "content-type": "text/plain; charset=utf-8" })
      response.end("unauthorized")
      return
    }

    const filePath = path.join(apiFixtureRoot, url.pathname.replace(/^\/+/, ""))

    try {
      const body = await readFile(filePath)
      response.writeHead(200, {
        "content-type": filePath.endsWith(".json") ? "application/json; charset=utf-8" : "image/svg+xml",
      })
      response.end(body)
    } catch {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" })
      response.end("not found")
    }
  })

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => resolve())
  })

  const address = server.address()
  if (!address || typeof address === "string") {
    throw new Error("Failed to determine fixture server address")
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    requests,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error)
            return
          }
          resolve()
        })
      }),
  }
}
