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

  it("inlines mask styles for static object literals", async () => {
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

    expect(transformed).toContain('import "virtual:effective-icon/mask.css"')
    expect(transformed).toContain("effective-icon-mask")
    expect(transformed).toContain("--effective-icon-mask-image")
    expect(transformed).toContain('color: "tomato"')
    expect(transformed).not.toContain("buildIconMaskStyle")
    expect(transformed).toContain("<span")
  })

  it("inlines solid mask styles as CSS text for static paths", async () => {
    const resolvedPackage = await loadResolvedPackage()
    const source = `
      import { Icon } from "${COMPILE_MODULE_ID}"

      const view = <Icon name="airplane" class="icon" />
    `

    const transformed = transformCompileTimeIcons(source, "/virtual/input.tsx", {
      options: {
        package: packageName,
        surface: "jsx",
        renderMode: "mask",
        styleTarget: "string",
      },
      resolvedPackage,
    })

    expect(transformed).toContain('import "virtual:effective-icon/mask.css"')
    expect(transformed).toContain("effective-icon-mask")
    expect(transformed).toContain("--effective-icon-mask-image")
    expect(transformed).not.toContain("buildIconMaskStyleString")
    expect(transformed).toContain("<span")
  })

  it("keeps the runtime helper for dynamic mask styles", async () => {
    const resolvedPackage = await loadResolvedPackage()
    const source = `
      import { Icon } from "${COMPILE_MODULE_ID}"

      const iconStyle = getIconStyle()
      const view = <Icon name="airplane" className="icon" style={iconStyle} />
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
    expect(transformed).toContain("iconStyle")
    expect(transformed).toContain("<span")
  })

  it("merges dynamic className expressions for mask output", async () => {
    const resolvedPackage = await loadResolvedPackage()
    const source = `
      import { Icon } from "${COMPILE_MODULE_ID}"

      const iconClass = getIconClass()
      const view = <Icon name="airplane" className={iconClass} />
    `

    const transformed = transformCompileTimeIcons(source, "/virtual/input.tsx", {
      options: {
        package: packageName,
        surface: "jsx",
        renderMode: "mask",
      },
      resolvedPackage,
    })

    expect(transformed).toContain("effective-icon-mask")
    expect(transformed).toContain(".filter(Boolean).join(\" \")")
  })

  it("merges dynamic class expressions for solid mask output", async () => {
    const resolvedPackage = await loadResolvedPackage()
    const source = `
      import { Icon } from "${COMPILE_MODULE_ID}"

      const iconClass = getIconClass()
      const view = <Icon name="airplane" class={iconClass} />
    `

    const transformed = transformCompileTimeIcons(source, "/virtual/input.tsx", {
      options: {
        package: packageName,
        surface: "jsx",
        renderMode: "mask",
        styleTarget: "string",
      },
      resolvedPackage,
    })

    expect(transformed).toContain("effective-icon-mask")
    expect(transformed).toContain(".filter(Boolean).join(\" \")")
  })

  it("imports the virtual mask css only once per file", async () => {
    const resolvedPackage = await loadResolvedPackage()
    const source = `
      import { Icon } from "${COMPILE_MODULE_ID}"

      const first = <Icon name="airplane" />
      const second = <Icon name="add-1" />
    `

    const transformed = transformCompileTimeIcons(source, "/virtual/input.tsx", {
      options: {
        package: packageName,
        surface: "jsx",
        renderMode: "mask",
      },
      resolvedPackage,
    })

    expect(transformed?.match(/virtual:effective-icon\/mask\.css/g)).toHaveLength(1)
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

  it("fails on unsupported direct custom-element authoring", async () => {
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
    ).toThrow(/no longer supported/)
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
