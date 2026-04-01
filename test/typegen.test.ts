import path from "node:path"

import { describe, expect, it } from "vitest"

import { resolveIconPackage } from "../src/resolve-package"
import { renderIconkitTypeFile } from "../src/typegen"

const repoRoot = path.resolve(process.cwd())

describe("iconkit typegen", () => {
  it("renders a compile-module augmentation for the selected pack", async () => {
    const resolvedPackage = await resolveIconPackage("@icon-pkg/streamline-core-line-free", repoRoot)
    const output = renderIconkitTypeFile(resolvedPackage)

    expect(output).toContain('import "iconkit/compile"')
    expect(output).toContain('declare module "iconkit/compile"')
    expect(output).toContain('interface IconkitCompileTypeRegistry')
    expect(output).toContain('| "airplane"')
    expect(output).toContain('| "anchor"')
    expect(output).not.toContain('| "rocket"')
  })
})
