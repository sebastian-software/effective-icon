import { createServer } from "node:http"
import { readFile } from "node:fs/promises"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"
import { build } from "vite"

const fixtureAppRoot = path.resolve(process.cwd(), "fixtures/vite-app")
const apiFixtureRoot = path.resolve(process.cwd(), "fixtures/api")
const fixtureToken = "fixture-token"

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

  it("builds the fixture app with api icons via a local Streamline API fixture server", async () => {
    const server = await startFixtureServer()
    process.env.STREAMLINE_SOURCE_MODE = "api"
    process.env.STREAMLINE_FIXTURE_BASE_URL = server.baseUrl
    process.env.STREAMLINE_FIXTURE_TOKEN = fixtureToken

    try {
      const outputs = await buildFixtureApp()

      assertLazyIconChunks(outputs)
      expect(server.requests).toEqual([
        {
          path: "/v1/search/global",
          search: "?productType=icons&query=rocket&style=regular&productTier=free",
          apiKey: "fixture-token",
        },
        { path: "/v1/icons/ico_rocket/download/svg", search: "", apiKey: "fixture-token" },
        {
          path: "/v1/search/global",
          search: "?productType=icons&query=search&style=regular&productTier=free",
          apiKey: "fixture-token",
        },
        { path: "/v1/icons/ico_search/download/svg", search: "", apiKey: "fixture-token" },
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
  requests: Array<{ path: string; search: string; apiKey?: string }>
}> {
  const requests: Array<{ path: string; search: string; apiKey?: string }> = []

  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host}`)
    const apiKey = request.headers["x-api-key"]
    requests.push({ path: url.pathname, search: url.search, apiKey: typeof apiKey === "string" ? apiKey : undefined })

    if (apiKey !== fixtureToken) {
      response.writeHead(401, { "content-type": "text/plain; charset=utf-8" })
      response.end("unauthorized")
      return
    }

    if (url.pathname === "/v1/search/global") {
      const query = url.searchParams.get("query")
      const productType = url.searchParams.get("productType")
      const style = url.searchParams.get("style")
      const productTier = url.searchParams.get("productTier")

      if ((query === "rocket" || query === "search") && productType === "icons" && style === "regular" && productTier === "free") {
        response.writeHead(200, { "content-type": "application/json; charset=utf-8" })
        response.end(
          JSON.stringify({
            query,
            results: [
              {
                hash: `ico_${query}`,
                name: `${query[0]?.toUpperCase() ?? ""}${query.slice(1)} Regular`,
                imagePreviewUrl: `https://assets.example.test/${query}.png`,
                isFree: true,
                familySlug: "fixture-regular",
                familyName: "Fixture Regular",
                categorySlug: "interface-essential",
                categoryName: "Interface Essential",
                subcategorySlug: "navigation",
                subcategoryName: "Navigation",
              },
            ],
            pagination: {
              total: 1,
              hasMore: false,
              offset: 0,
              nextOffset: 0,
            },
          })
        )
        return
      }

      response.writeHead(404, { "content-type": "application/json; charset=utf-8" })
      response.end(JSON.stringify({ message: "not found" }))
      return
    }

    const downloadMatch = url.pathname.match(/^\/v1\/icons\/(ico_[^/]+)\/download\/svg$/)
    if (downloadMatch) {
      const filePath = path.join(apiFixtureRoot, "icons/regular", `${downloadMatch[1].replace(/^ico_/, "")}.svg`)

      try {
        const body = await readFile(filePath)
        response.writeHead(200, { "content-type": "image/svg+xml" })
        response.end(body)
      } catch {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" })
        response.end("not found")
      }
      return
    }

    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" })
    response.end("not found")
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
