import path from "node:path"
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises"
import { setTimeout as delay } from "node:timers/promises"

import { afterEach, describe, expect, it } from "vitest"

import { resolveIconPackage, type ResolvedIconPackage } from "../src/resolve-package"
import { renderEffectiveIconTypeFile, syncEffectiveIconTypeFile } from "../src/typegen"

const repoRoot = path.resolve(process.cwd())
const tempRoots: string[] = []

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })))
})

describe("@effective/icon typegen", () => {
  it("renders a compile-module augmentation for the selected pack", async () => {
    const resolvedPackage = await resolveIconPackage("@icon-pkg/streamline-core-line-free", repoRoot)
    const output = renderEffectiveIconTypeFile(resolvedPackage)

    expect(output).toContain('import "@effective/icon/compile"')
    expect(output).toContain('declare module "@effective/icon/compile"')
    expect(output).toContain('interface EffectiveIconCompileTypeRegistry')
    expect(output).toContain('| "airplane"')
    expect(output).toContain('| "anchor"')
    expect(output).not.toContain('| "rocket"')
  })

  it('renders "never" when no icon names are available', () => {
    const output = renderEffectiveIconTypeFile({
      packageName: "@icon-pkg/empty-pack",
      packageDir: "/virtual/package",
      manifestPath: "/virtual/package/manifest.json",
      manifest: {
        name: "@icon-pkg/empty-pack",
        label: "Empty pack",
        version: "1.0.0",
        license: "MIT",
        homepage: "https://example.com",
        icons: [],
      },
      iconsByName: new Map(),
    } as unknown as ResolvedIconPackage)

    expect(output).toContain("iconName: never")
  })

  it("returns null when type generation is disabled", async () => {
    const resolvedPackage = await resolveIconPackage("@icon-pkg/streamline-core-line-free", repoRoot)
    const root = await createTempRoot("effective-icon-typegen-disabled-")

    await expect(
      syncEffectiveIconTypeFile({
        outputFile: false,
        resolvedPackage,
        root,
      })
    ).resolves.toBeNull()
  })

  it("writes to src by default when a src directory exists", async () => {
    const resolvedPackage = await resolveIconPackage("@icon-pkg/streamline-core-line-free", repoRoot)
    const root = await createTempRoot("effective-icon-typegen-src-")

    await mkdir(path.join(root, "src"), { recursive: true })

    const filePath = await syncEffectiveIconTypeFile({
      resolvedPackage,
      root,
    })

    expect(filePath).toBe(path.join(root, "src", "effective-icon.generated.d.ts"))
    await expect(readFile(filePath!, "utf8")).resolves.toContain('| "airplane"')
  })

  it("falls back to the project root when src does not exist", async () => {
    const resolvedPackage = await resolveIconPackage("@icon-pkg/streamline-core-line-free", repoRoot)
    const root = await createTempRoot("effective-icon-typegen-root-")

    const filePath = await syncEffectiveIconTypeFile({
      resolvedPackage,
      root,
    })

    expect(filePath).toBe(path.join(root, "effective-icon.generated.d.ts"))
    await expect(readFile(filePath!, "utf8")).resolves.toContain('| "anchor"')
  })

  it("supports an explicit output path and skips rewriting identical content", async () => {
    const resolvedPackage = await resolveIconPackage("@icon-pkg/streamline-core-line-free", repoRoot)
    const root = await createTempRoot("effective-icon-typegen-explicit-")
    const outputFile = "types/icons.generated.d.ts"

    await writeFile(path.join(root, "package.json"), '{"name":"effective-icon-typegen-test"}\n', "utf8")

    const firstPath = await syncEffectiveIconTypeFile({
      outputFile,
      resolvedPackage,
      root,
    })
    const firstStat = await stat(firstPath!)

    await delay(20)

    const secondPath = await syncEffectiveIconTypeFile({
      outputFile,
      resolvedPackage,
      root,
    })
    const secondStat = await stat(secondPath!)

    expect(firstPath).toBe(path.join(root, outputFile))
    expect(secondPath).toBe(firstPath)
    expect(secondStat.mtimeMs).toBe(firstStat.mtimeMs)
  })
})

async function createTempRoot(prefix: string): Promise<string> {
  const root = await mkdtemp(path.join(repoRoot, prefix))
  tempRoots.push(root)
  return root
}
