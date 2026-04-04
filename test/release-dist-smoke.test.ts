import os from "node:os"
import path from "node:path"
import { execFile } from "node:child_process"
import { mkdtemp, mkdir, writeFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { pathToFileURL } from "node:url"
import { promisify } from "node:util"

import react from "@vitejs/plugin-react"
import { beforeAll, describe, expect, it } from "vitest"
import { build } from "vite"

const execFileAsync = promisify(execFile)
const repoRoot = path.resolve(process.cwd())
const distRoot = path.join(repoRoot, "dist")
const requireFromRoot = createRequire(path.join(repoRoot, "package.json"))

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

describe.sequential("release dist smoke", () => {
  beforeAll(async () => {
    await execFileAsync("pnpm", ["build"], { cwd: repoRoot })
  })

  it("builds a consumer app against dist plugin, compile, and runtime exports", async () => {
    const root = await createTempApp()
    const { effectiveIconVitePlugin } = await import(pathToFileURL(path.join(distRoot, "plugin.js")).href)

    const result = await build({
      root,
      logLevel: "silent",
      plugins: [
        effectiveIconVitePlugin({
          package: "@icon-pkg/streamline-core-line-free",
          surface: "jsx",
          renderMode: "mask",
          typesOutputFile: false,
        }),
        react(),
      ],
      resolve: {
        alias: [
          { find: /^react$/, replacement: requireFromRoot.resolve("react") },
          { find: /^react\/jsx-runtime$/, replacement: requireFromRoot.resolve("react/jsx-runtime") },
          { find: /^react\/jsx-dev-runtime$/, replacement: requireFromRoot.resolve("react/jsx-dev-runtime") },
          { find: /^react-dom\/client$/, replacement: requireFromRoot.resolve("react-dom/client") },
          { find: /^@effective\/icon\/compile$/, replacement: path.join(distRoot, "compile.js") },
          { find: /^@effective\/icon\/runtime$/, replacement: path.join(distRoot, "runtime.js") },
        ],
      },
      build: {
        minify: false,
        outDir: path.join(root, "dist"),
        rollupOptions: {
          input: path.join(root, "src", "main.tsx"),
        },
        write: false,
      },
    })

    const outputs = Array.isArray(result) ? (result as BuildOutput[]) : [result as BuildOutput]
    const code = outputs
      .flatMap((output) => output.output)
      .filter((output): output is BuildChunk => output.type === "chunk")
      .map((output) => output.code)
      .join("\n")
    const assets = outputs
      .flatMap((output) => output.output)
      .filter((output): output is BuildAsset => output.type === "asset")
      .map((output) => (typeof output.source === "string" ? output.source : Buffer.from(output.source).toString("utf8")))
      .join("\n")

    expect(code).toContain("effective-icon-mask")
    expect(code).toContain("--effective-icon-mask-image")
    expect(code).not.toContain("@effective/icon/compile")
    expect(assets).toContain(".effective-icon-mask")
  })
})

async function createTempApp(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "effective-icon-dist-smoke-"))
  await mkdir(path.join(root, "src"), { recursive: true })
  await writeFile(path.join(root, "index.html"), '<!doctype html><html><body><div id="app"></div><script type="module" src="/src/main.tsx"></script></body></html>')
  await writeFile(
    path.join(root, "src", "main.tsx"),
    `import { createRoot } from "react-dom/client"
import { Icon } from "@effective/icon/compile"

const app = document.querySelector("#app")

if (!app) {
  throw new Error("Missing #app root element")
}

createRoot(app).render(<Icon name="airplane" className="status-icon" aria-label="Airplane" />)
`
  )

  return root
}
