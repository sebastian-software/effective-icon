import { mkdtempSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"

import { print } from "esrap"
import tsx from "esrap/languages/tsx"
import { parseSync } from "oxc-parser"
import { describe, expect, it } from "vitest"

import type * as ESTree from "@oxc-project/types"

import {
  appendClassName,
  createA11yFallback,
  createImageFallback,
  getJsxAttributeExpression,
  getJsxAttributeName,
  mergeJsxAttributes,
  renderJsxAttributes,
} from "../src/transform-jsx"
import { createInlineMaskStyle, toCssPropertyName, withMaskClass } from "../src/transform-mask"
import { cloneStaticJsxNode, createInlineSvgElement, parseInlineSvg } from "../src/transform-svg"

const JSX_PRINTER = tsx()

function parseJsxElement(source: string): ESTree.JSXElement {
  const { program } = parseSync("test.tsx", source, {
    lang: "tsx",
    sourceType: "module",
    astType: "ts",
    range: true,
  })
  const statement = program.body[0]

  if (!statement || statement.type !== "ExpressionStatement" || statement.expression.type !== "JSXElement") {
    throw new Error("Expected a JSX element")
  }

  return statement.expression
}

function parseAttributeHost(source: string): { code: string; attributes: ESTree.JSXAttributeItem[] } {
  const code = `<div ${source} />`
  return {
    code,
    attributes: parseJsxElement(code).openingElement.attributes,
  }
}

function printNode(node: object): string {
  return print(node as never, JSX_PRINTER).code
}

describe("transform JSX helpers", () => {
  it("merges named attributes while preserving spreads", () => {
    const existing = parseAttributeHost('foo="first" {...spread}').attributes
    const forwarded = parseAttributeHost('foo="second" bar={value}').attributes

    const merged = mergeJsxAttributes(existing, forwarded)
    const fooAttribute = merged.find((attribute) => getJsxAttributeName(attribute) === "foo") as ESTree.JSXAttribute

    expect(renderJsxAttributes(merged, `<div foo="first" {...spread} foo="second" bar={value} />`).join(" ")).toContain(
      "{...spread}"
    )
    expect(fooAttribute.value?.type).toBe("Literal")
    expect((fooAttribute.value as ESTree.StringLiteral).value).toBe("second")
  })

  it("reads string and expression attribute values", () => {
    const { attributes } = parseAttributeHost('title="hello" count={value}')

    expect(printNode(getJsxAttributeExpression(attributes, "title")!)).toBe('"hello"')
    expect(printNode(getJsxAttributeExpression(attributes, "count")!)).toBe("value")
    expect(getJsxAttributeExpression(attributes, "missing")).toBeUndefined()
  })

  it("appends class names to empty and dynamic class props", () => {
    const emptyHost = parseAttributeHost("className")
    const dynamicHost = parseAttributeHost("className={iconClass}")

    expect(appendClassName(emptyHost.attributes[0] as ESTree.JSXAttribute, emptyHost.code, "effective-icon-mask")).toContain(
      'className="effective-icon-mask"'
    )
    expect(
      appendClassName(dynamicHost.attributes[0] as ESTree.JSXAttribute, dynamicHost.code, "effective-icon-mask")
    ).toContain('[iconClass, "effective-icon-mask"].filter(Boolean).join(" ")')
  })

  it("adds image and a11y fallbacks only when missing", () => {
    const bareAttributes = parseAttributeHost("").attributes
    const labelledAttributes = parseAttributeHost('alt="Plane" role="img"').attributes

    expect(renderJsxAttributes(createImageFallback(bareAttributes)).join(" ")).toContain('alt=""')
    expect(renderJsxAttributes(createImageFallback(bareAttributes)).join(" ")).toContain('aria-hidden="true"')
    expect(createA11yFallback(labelledAttributes)).toHaveLength(0)
  })
})

describe("transform mask helpers", () => {
  it("creates inline mask style objects and css text", () => {
    const styleHost = parseAttributeHost('style={{ color: "tomato", 1: "one", WebkitMaskSize: "cover" }}')
    const styleExpression = getJsxAttributeExpression(styleHost.attributes, "style")

    const styleObject = createInlineMaskStyle(undefined, "__icon0", "object", styleHost.code)
    const styleText = createInlineMaskStyle(styleExpression, "__icon0", "string", styleHost.code)

    expect(styleObject).toContain('"--effective-icon-mask-image": `url("${__icon0}")`')
    expect(styleText).toContain("--effective-icon-mask-image")
    expect(styleText).toContain("color:")
    expect(styleText).toContain("-webkit-mask-size:")
    expect(styleText).toContain("1:")
  })

  it("returns undefined for dynamic or unsupported mask style objects", () => {
    const dynamic = parseAttributeHost("style={styleVar}")
    const spread = parseAttributeHost("style={{ ...rest }}")
    const computed = parseAttributeHost("style={{ [prop]: value }}")

    expect(createInlineMaskStyle(getJsxAttributeExpression(dynamic.attributes, "style"), "__icon0", "object", dynamic.code)).toBeUndefined()
    expect(createInlineMaskStyle(getJsxAttributeExpression(spread.attributes, "style"), "__icon0", "object", spread.code)).toBeUndefined()
    expect(createInlineMaskStyle(getJsxAttributeExpression(computed.attributes, "style"), "__icon0", "object", computed.code)).toBeUndefined()
  })

  it("normalizes css property names and appends the mask class", () => {
    const host = parseAttributeHost("class={classes}")
    const merged = withMaskClass(host.attributes, "class", host.code)

    expect(toCssPropertyName("--custom-token")).toBe("--custom-token")
    expect(toCssPropertyName("WebkitMaskPosition")).toBe("-webkit-mask-position")
    expect(toCssPropertyName("backgroundColor")).toBe("background-color")
    expect(merged.join(" ")).toContain('[classes, "effective-icon-mask"].filter(Boolean).join(" ")')
  })
})

describe("transform SVG helpers", () => {
  it("throws when no inline svg ast is available", () => {
    expect(() => createInlineSvgElement(undefined, "airplane", [])).toThrow(/Missing inline SVG AST/)
  })

  it("clones inline svg nodes deeply and merges forwarded attributes", () => {
    const svg = parseJsxElement(
      '<svg xmlns:xlink="http://www.w3.org/1999/xlink"><g>{"hi"}<path /><this.Icon /><><title>{"label"}</title></></g></svg>'
    )
    const cloned = cloneStaticJsxNode(svg)
    const forwarded = parseAttributeHost('aria-hidden="true"').attributes
    const merged = createInlineSvgElement(cloned, "airplane", forwarded)
    const reparsed = parseJsxElement(merged)
    const ariaHidden = reparsed.openingElement.attributes.find((attribute) => getJsxAttributeName(attribute) === "aria-hidden")
    const group = reparsed.children[0] as ESTree.JSXElement
    const fragment = group.children[3] as ESTree.JSXFragment
    const title = fragment.children[0] as ESTree.JSXElement
    const titleExpression = (title.children[0] as ESTree.JSXExpressionContainer).expression

    expect(cloned).not.toBe(svg)
    expect(merged).toContain('xmlns:xlink="http://www.w3.org/1999/xlink"')
    expect(ariaHidden).toBeDefined()
    expect(merged).toContain("<this.Icon />")
    expect(title.openingElement.name.type === "JSXIdentifier" ? title.openingElement.name.name : undefined).toBe("title")
    expect(titleExpression.type).toBe("Literal")
    expect((titleExpression as ESTree.StringLiteral).value).toBe("label")
  })

  it("prints spread children and exotic tag names", () => {
    const namespaced = parseJsxElement("<svg:path />")
    const propertyAccess = parseJsxElement("<this.Icon />")
    const withSpreadChild = parseJsxElement("<svg>{...items}</svg>")

    expect(printNode(cloneStaticJsxNode(namespaced))).toContain("<svg:path />")
    expect(printNode(cloneStaticJsxNode(propertyAccess))).toContain("<this.Icon />")
    expect(printNode(cloneStaticJsxNode(withSpreadChild))).toContain("{...items}")
  })

  it("parses inline svg files and rejects invalid roots", () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "effective-icon-transform-"))
    const validPath = path.join(tempDir, "valid.svg")
    const groupPath = path.join(tempDir, "group.svg")
    const textPath = path.join(tempDir, "text.svg")
    const emptyPath = path.join(tempDir, "empty.svg")

    writeFileSync(validPath, '<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z" /></svg>')
    writeFileSync(groupPath, "<g />")
    writeFileSync(textPath, '"hello"')
    writeFileSync(emptyPath, "")

    expect(printNode(parseInlineSvg(validPath, "/virtual/input.tsx"))).toContain("<svg")
    expect(() => parseInlineSvg(groupPath, "/virtual/input.tsx")).toThrow(/Expected root <svg> element/)
    expect(() => parseInlineSvg(textPath, "/virtual/input.tsx")).toThrow(/Could not parse inline SVG/)
    expect(() => parseInlineSvg(emptyPath, "/virtual/input.tsx")).toThrow(/Could not parse inline SVG/)
  })
})
