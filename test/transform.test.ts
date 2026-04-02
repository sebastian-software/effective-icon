import path from "node:path"

import { describe, expect, it } from "vitest"

import { resolveIconPackage } from "../src/resolve-package"
import { COMPILE_MODULE_ID, transformCompileTimeIcons } from "../src/transform"

const repoRoot = path.resolve(process.cwd())
const packageName = "@icon-pkg/streamline-core-line-free"

async function loadResolvedPackage() {
  return resolveIconPackage(packageName, repoRoot)
}

describe("compile-time transform", () => {
  it("rewrites JSX icons for image mode", async () => {
    const resolvedPackage = await loadResolvedPackage()
    const source = `
      import { Icon } from "${COMPILE_MODULE_ID}"

      const view = (
        <section>
          <Icon name="airplane" className="icon" />
          <div className="slot"><Icon name="add-1" /></div>
        </section>
      )
    `

    const transformed = transformCompileTimeIcons(source, "/virtual/input.tsx", {
      options: {
        package: packageName,
        surface: "jsx",
        renderMode: "image",
      },
      resolvedPackage,
    })

    expect(transformed).toContain("?url")
    expect(transformed).toContain("<img")
    expect(transformed).not.toContain(COMPILE_MODULE_ID)
  })

  it("rewrites JSX icons for svg mode", async () => {
    const resolvedPackage = await loadResolvedPackage()
    const source = `
      import { Icon } from "${COMPILE_MODULE_ID}"

      const view = <Icon name="airplane" className="icon" aria-label="Airplane" />
    `

    const transformed = transformCompileTimeIcons(source, "/virtual/input.tsx", {
      options: {
        package: packageName,
        surface: "jsx",
        renderMode: "svg",
      },
      resolvedPackage,
    })

    expect(transformed).toContain("<svg")
    expect(transformed).toContain('className="icon"')
    expect(transformed).not.toContain("?url")
  })

  it("rewrites JSX icons for mask mode", async () => {
    const resolvedPackage = await loadResolvedPackage()
    const source = `
      import { Icon } from "${COMPILE_MODULE_ID}"

      const view = <Icon name="airplane" className="icon" style={{ color: "tomato" }} />
    `

    const transformed = transformCompileTimeIcons(source, "/virtual/input.tsx", {
      options: {
        package: packageName,
        surface: "jsx",
        renderMode: "mask",
      },
      resolvedPackage,
    })

    expect(transformed).toContain("buildIconMaskStyle")
    expect(transformed).toContain("<span")
  })

  it("rewrites direct custom-element icons for custom-element surface", async () => {
    const resolvedPackage = await loadResolvedPackage()
    const source = `
      const view = <section><effective-icon name="airplane" className="icon" /></section>
    `

    const transformed = transformCompileTimeIcons(source, "/virtual/input.tsx", {
      options: {
        package: packageName,
        surface: "custom-element",
        renderMode: "image",
      },
      resolvedPackage,
    })

    expect(transformed).toContain("?url")
    expect(transformed).toContain("data-icon-url")
    expect(transformed).toContain("ensureIconElement")
    expect(transformed).toContain("effective-icon")
    expect(transformed).not.toContain('name="airplane"')
  })

  it("fails on missing compile import", async () => {
    const resolvedPackage = await loadResolvedPackage()

    expect(() =>
      transformCompileTimeIcons(`const view = <Icon name="airplane" />`, "/virtual/input.tsx", {
        options: {
          package: packageName,
          surface: "jsx",
          renderMode: "image",
        },
        resolvedPackage,
      })
    ).toThrow(/Import \{ Icon \}/)
  })

  it("fails on unknown icons", async () => {
    const resolvedPackage = await loadResolvedPackage()

    expect(() =>
      transformCompileTimeIcons(
        `import { Icon } from "${COMPILE_MODULE_ID}"; const view = <Icon name="missing" />`,
        "/virtual/input.tsx",
        {
          options: {
          package: packageName,
          surface: "jsx",
          renderMode: "image",
        },
          resolvedPackage,
        }
      )
    ).toThrow(/Unknown icon "missing"/)
  })

  it("fails on dynamic names", async () => {
    const resolvedPackage = await loadResolvedPackage()

    expect(() =>
      transformCompileTimeIcons(
        `import { Icon } from "${COMPILE_MODULE_ID}"; const name = "airplane"; const view = <Icon name={name} />`,
        "/virtual/input.tsx",
        {
          options: {
          package: packageName,
          surface: "jsx",
          renderMode: "image",
        },
          resolvedPackage,
        }
      )
    ).toThrow(/requires name="literal"/)
  })

  it("fails on the wrong authoring surface for each surface", async () => {
    const resolvedPackage = await loadResolvedPackage()

    expect(() =>
      transformCompileTimeIcons(
        `const view = <effective-icon name="airplane" />`,
        "/virtual/input.tsx",
        {
          options: {
            package: packageName,
            surface: "jsx",
            renderMode: "image",
          },
          resolvedPackage,
        }
      )
    ).toThrow(/only supported when surface is "custom-element"/)

    expect(() =>
      transformCompileTimeIcons(
        `import { Icon } from "${COMPILE_MODULE_ID}"; const view = <Icon name="airplane" />`,
        "/virtual/input.tsx",
        {
          options: {
            package: packageName,
            surface: "custom-element",
            renderMode: "image",
          },
          resolvedPackage,
        }
      )
    ).toThrow(/only supported when surface is "jsx"/)
  })

  it("fails on spread props and children", async () => {
    const resolvedPackage = await loadResolvedPackage()

    expect(() =>
      transformCompileTimeIcons(
        `import { Icon } from "${COMPILE_MODULE_ID}"; const props = {}; const view = <Icon name="airplane" {...props} />`,
        "/virtual/input.tsx",
        {
          options: {
          package: packageName,
          surface: "jsx",
          renderMode: "image",
        },
          resolvedPackage,
        }
      )
    ).toThrow(/spread props/)

    expect(() =>
      transformCompileTimeIcons(
        `import { Icon } from "${COMPILE_MODULE_ID}"; const view = <Icon name="airplane">child</Icon>`,
        "/virtual/input.tsx",
        {
          options: {
          package: packageName,
          surface: "jsx",
          renderMode: "image",
        },
          resolvedPackage,
        }
      )
    ).toThrow(/does not support children/)
  })
})
