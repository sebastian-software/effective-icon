import path from "node:path"

import { describe, expect, it } from "vitest"

import { resolveIconPackage } from "../src/resolve-package"
import { renderEffectiveIconTypeFile } from "../src/typegen"

const repoRoot = path.resolve(process.cwd())

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
})
