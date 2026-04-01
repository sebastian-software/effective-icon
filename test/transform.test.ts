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
      import { Icon, icon } from "${COMPILE_MODULE_ID}"

      const view = (
        <section>
          <Icon name="airplane" className="icon" />
          {icon\`add-1\`}
        </section>
      )
    `

    const transformed = transformCompileTimeIcons(source, "/virtual/input.tsx", {
      options: {
        package: packageName,
        target: "jsx",
        renderMode: "image",
      },
      resolvedPackage,
    })

    expect(transformed).toContain("?url")
    expect(transformed).toContain("<img")
    expect(transformed).not.toContain(COMPILE_MODULE_ID)
  })

  it("rewrites JSX icons for inline-svg mode", async () => {
    const resolvedPackage = await loadResolvedPackage()
    const source = `
      import { Icon } from "${COMPILE_MODULE_ID}"

      const view = <Icon name="airplane" className="icon" aria-label="Airplane" />
    `

    const transformed = transformCompileTimeIcons(source, "/virtual/input.tsx", {
      options: {
        package: packageName,
        target: "jsx",
        renderMode: "inline-svg",
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
        target: "jsx",
        renderMode: "mask",
      },
      resolvedPackage,
    })

    expect(transformed).toContain("buildIconMaskStyle")
    expect(transformed).toContain("<span")
  })

  it("rewrites template tags for web-component mode", async () => {
    const resolvedPackage = await loadResolvedPackage()
    const source = `
      import { icon } from "${COMPILE_MODULE_ID}"

      const view = <section>{icon\`airplane\`}</section>
    `

    const transformed = transformCompileTimeIcons(source, "/virtual/input.tsx", {
      options: {
        package: packageName,
        target: "web-component",
        renderMode: "image",
      },
      resolvedPackage,
    })

    expect(transformed).toContain("?url")
    expect(transformed).toContain("data-icon-url")
    expect(transformed).toContain("ensureIconElement")
    expect(transformed).toContain("effective-icon")
  })

  it("fails on missing compile import", async () => {
    const resolvedPackage = await loadResolvedPackage()

    expect(() =>
      transformCompileTimeIcons(`const view = <Icon name="airplane" />`, "/virtual/input.tsx", {
        options: {
          package: packageName,
          target: "jsx",
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
          target: "jsx",
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
          target: "jsx",
          renderMode: "image",
        },
          resolvedPackage,
        }
      )
    ).toThrow(/requires name="literal"/)
  })

  it("fails on template interpolation", async () => {
    const resolvedPackage = await loadResolvedPackage()

    expect(() =>
      transformCompileTimeIcons(
        `import { icon } from "${COMPILE_MODULE_ID}"; const value = "airplane"; const view = <section>{icon\`${"${value}"}\`}</section>`,
        "/virtual/input.tsx",
        {
          options: {
          package: packageName,
          target: "jsx",
          renderMode: "image",
        },
          resolvedPackage,
        }
      )
    ).toThrow(/do not support interpolation/)
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
          target: "jsx",
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
          target: "jsx",
          renderMode: "image",
        },
          resolvedPackage,
        }
      )
    ).toThrow(/does not support children/)
  })
})
