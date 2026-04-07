import { mkdtempSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"

import ts from "typescript"
import { describe, expect, it } from "vitest"

import {
  appendClassName,
  createA11yFallback,
  createImageFallback,
  getJsxAttributeName,
  getJsxAttributeExpression,
  mergeJsxAttributes,
} from "../src/transform-jsx"
import { createInlineMaskStyle, toCssPropertyName, withMaskClass } from "../src/transform-mask"
import { cloneStaticJsxNode, createInlineSvgElement, parseInlineSvg } from "../src/transform-svg"

function createSourceFile(source: string) {
  return ts.createSourceFile("test.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
}

function parseSelfClosingElement(source: string): ts.JsxSelfClosingElement {
  const file = createSourceFile(`const view = ${source};`)
  const statement = file.statements[0]
  if (!statement || !ts.isVariableStatement(statement)) {
    throw new Error("Expected a variable statement")
  }

  const initializer = statement.declarationList.declarations[0]?.initializer
  if (!initializer || !ts.isJsxSelfClosingElement(initializer)) {
    throw new Error("Expected a JSX self-closing element")
  }

  return initializer
}

function parseElement(source: string): ts.JsxElement {
  const file = createSourceFile(`const view = ${source};`)
  const statement = file.statements[0]
  if (!statement || !ts.isVariableStatement(statement)) {
    throw new Error("Expected a variable statement")
  }

  const initializer = statement.declarationList.declarations[0]?.initializer
  if (!initializer || !ts.isJsxElement(initializer)) {
    throw new Error("Expected a JSX element")
  }

  return initializer
}

function printNode(node: ts.Node): string {
  const file = createSourceFile("")
  return ts.createPrinter({ removeComments: true }).printNode(ts.EmitHint.Unspecified, node, file)
}

function printAttributes(attributes: readonly ts.JsxAttributeLike[]): string {
  const element = ts.factory.createJsxSelfClosingElement(
    ts.factory.createIdentifier("div"),
    undefined,
    ts.factory.createJsxAttributes([...attributes])
  )

  return printNode(element)
}

describe("transform JSX helpers", () => {
  it("merges named attributes while preserving spreads", () => {
    const existing = parseSelfClosingElement('<div foo="first" {...spread} />').attributes.properties
    const forwarded = parseSelfClosingElement('<div foo="second" bar={value} />').attributes.properties

    const merged = mergeJsxAttributes(existing, forwarded)
    const fooAttribute = merged.find((attribute) => getJsxAttributeName(attribute) === "foo") as ts.JsxAttribute

    expect(printAttributes(merged)).toContain('{...spread}')
    expect(fooAttribute.initializer && ts.isStringLiteral(fooAttribute.initializer)).toBe(true)
    expect((fooAttribute.initializer as ts.StringLiteral).text).toBe("second")
    expect(printAttributes(merged)).toContain("bar={value}")
  })

  it("reads string and expression attribute values", () => {
    const attributes = parseSelfClosingElement('<div title="hello" count={value} />').attributes.properties

    expect(printNode(getJsxAttributeExpression(attributes, "title")!)).toBe('"hello"')
    expect(printNode(getJsxAttributeExpression(attributes, "count")!)).toBe("value")
    expect(getJsxAttributeExpression(attributes, "missing")).toBeUndefined()
  })

  it("appends class names to empty and dynamic class props", () => {
    const emptyClass = parseSelfClosingElement("<div className />").attributes.properties[0]
    const dynamicClass = parseSelfClosingElement("<div className={iconClass} />").attributes.properties[0]

    expect(printNode(appendClassName(emptyClass as ts.JsxAttribute, "effective-icon-mask"))).toContain(
      'className="effective-icon-mask"'
    )
    expect(printNode(appendClassName(dynamicClass as ts.JsxAttribute, "effective-icon-mask"))).toContain(
      '[iconClass, "effective-icon-mask"].filter(Boolean).join(" ")'
    )
  })

  it("leaves unsupported class initializers untouched", () => {
    const attribute = ts.factory.createJsxAttribute(
      ts.factory.createIdentifier("className"),
      ts.factory.createJsxElement(
        ts.factory.createJsxOpeningElement(
          ts.factory.createIdentifier("span"),
          undefined,
          ts.factory.createJsxAttributes([])
        ),
        [],
        ts.factory.createJsxClosingElement(ts.factory.createIdentifier("span"))
      )
    )

    expect(appendClassName(attribute, "effective-icon-mask")).toBe(attribute)
  })

  it("adds image and a11y fallbacks only when missing", () => {
    const bareAttributes = parseSelfClosingElement("<img />").attributes.properties
    const labelledAttributes = parseSelfClosingElement('<img alt="Plane" role="img" />').attributes.properties

    expect(printAttributes(createImageFallback(bareAttributes))).toContain('alt=""')
    expect(printAttributes(createImageFallback(bareAttributes))).toContain('aria-hidden="true"')
    expect(createA11yFallback(labelledAttributes)).toHaveLength(0)
  })
})

describe("transform mask helpers", () => {
  it("creates inline mask style objects and css text", () => {
    const styleObject = createInlineMaskStyle(undefined, "__icon0", "object")
    const styleText = createInlineMaskStyle(
      ts.factory.createObjectLiteralExpression(
        [
          ts.factory.createPropertyAssignment("color", ts.factory.createStringLiteral("tomato")),
          ts.factory.createPropertyAssignment(ts.factory.createNumericLiteral("1"), ts.factory.createStringLiteral("one")),
          ts.factory.createPropertyAssignment("WebkitMaskSize", ts.factory.createStringLiteral("cover")),
        ],
        true
      ),
      "__icon0",
      "string"
    )

    expect(printNode(styleObject!)).toContain('"--effective-icon-mask-image": `url("${__icon0}")`')
    expect(printNode(styleText!)).toContain('--effective-icon-mask-image:')
    expect(printNode(styleText!)).toContain("color:")
    expect(printNode(styleText!)).toContain("-webkit-mask-size:")
    expect(printNode(styleText!)).toContain("1:")
  })

  it("returns undefined for dynamic or unsupported mask style objects", () => {
    expect(createInlineMaskStyle(ts.factory.createIdentifier("styleVar"), "__icon0", "object")).toBeUndefined()
    expect(
      createInlineMaskStyle(
        ts.factory.createObjectLiteralExpression([ts.factory.createSpreadAssignment(ts.factory.createIdentifier("rest"))], true),
        "__icon0",
        "object"
      )
    ).toBeUndefined()
    expect(
      createInlineMaskStyle(
        ts.factory.createObjectLiteralExpression(
          [
            ts.factory.createPropertyAssignment(
              ts.factory.createComputedPropertyName(ts.factory.createIdentifier("prop")),
              ts.factory.createStringLiteral("value")
            ),
          ],
          true
        ),
        "__icon0",
        "object"
      )
    ).toBeUndefined()
  })

  it("normalizes css property names and appends the mask class", () => {
    const attributes = parseSelfClosingElement('<div class={classes} />').attributes.properties
    const merged = withMaskClass(attributes, "class")

    expect(toCssPropertyName("--custom-token")).toBe("--custom-token")
    expect(toCssPropertyName("WebkitMaskPosition")).toBe("-webkit-mask-position")
    expect(toCssPropertyName("backgroundColor")).toBe("background-color")
    expect(printAttributes(merged)).toContain('[classes, "effective-icon-mask"].filter(Boolean).join(" ")')
  })
})

describe("transform SVG helpers", () => {
  it("throws when no inline svg ast is available", () => {
    expect(() => createInlineSvgElement(undefined, "airplane", [])).toThrow(/Missing inline SVG AST/)
  })

  it("clones inline svg nodes deeply and merges forwarded attributes", () => {
    const svg = parseElement(
      '<svg xmlns:xlink="http://www.w3.org/1999/xlink"><g>{"hi"}<path /><this.Icon /><><title>{"label"}</title></></g></svg>'
    )
    const cloned = cloneStaticJsxNode(svg)
    const merged = createInlineSvgElement(cloned, "airplane", parseSelfClosingElement('<svg aria-hidden="true" />').attributes.properties)
    const mergedAttributes = ts.isJsxElement(merged) ? merged.openingElement.attributes.properties : merged.attributes.properties
    const ariaHidden = mergedAttributes.find((attribute) => getJsxAttributeName(attribute) === "aria-hidden") as
      | ts.JsxAttribute
      | undefined
    const group = ts.isJsxElement(merged) ? (merged.children[0] as ts.JsxElement) : undefined
    const fragment = group ? (group.children[3] as ts.JsxFragment) : undefined
    const title = fragment ? (fragment.children[0] as ts.JsxElement) : undefined
    const titleExpression = title ? (title.children[0] as ts.JsxExpression).expression : undefined

    expect(cloned).not.toBe(svg)
    expect(printNode(merged)).toContain('xmlns:xlink="http://www.w3.org/1999/xlink"')
    expect(ariaHidden).toBeDefined()
    expect(printNode(merged)).toContain("<this.Icon />")
    expect(title && ts.isIdentifier(title.openingElement.tagName) ? title.openingElement.tagName.text : undefined).toBe("title")
    expect(titleExpression && ts.isStringLiteral(titleExpression)).toBe(true)
    expect((titleExpression as ts.StringLiteral).text).toBe("label")
  })

  it("clones spread children and exotic tag names", () => {
    const namespaced = ts.factory.createJsxSelfClosingElement(
      ts.factory.createJsxNamespacedName(ts.factory.createIdentifier("svg"), ts.factory.createIdentifier("path")),
      undefined,
      ts.factory.createJsxAttributes([])
    )
    const propertyAccess = ts.factory.createJsxSelfClosingElement(
      ts.factory.createPropertyAccessExpression(ts.factory.createThis(), ts.factory.createIdentifier("Icon")) as ts.JsxTagNamePropertyAccess,
      undefined,
      ts.factory.createJsxAttributes([])
    )
    const withThisTag = ts.factory.createJsxElement(
      ts.factory.createJsxOpeningElement(ts.factory.createIdentifier("svg"), undefined, ts.factory.createJsxAttributes([])),
      [
        ts.factory.createJsxSelfClosingElement(
          ts.factory.createThis() as unknown as ts.JsxTagNameExpression,
          undefined,
          ts.factory.createJsxAttributes([])
        ),
      ],
      ts.factory.createJsxClosingElement(ts.factory.createIdentifier("svg"))
    )

    expect(printNode(cloneStaticJsxNode(namespaced))).toContain("<svg:path />")
    expect(printNode(cloneStaticJsxNode(propertyAccess))).toContain("<this.Icon />")
    expect(printNode(cloneStaticJsxNode(withThisTag))).toContain("<this />")
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
    expect(() => parseInlineSvg(textPath, "/virtual/input.tsx")).toThrow(/Expected root <svg> element/)
    expect(() => parseInlineSvg(emptyPath, "/virtual/input.tsx")).toThrow(/Expected root <svg> element/)
  })
})
