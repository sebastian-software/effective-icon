import { readFileSync } from "node:fs"

import { print } from "esrap"
import tsx from "esrap/languages/tsx"
import { parseSync } from "oxc-parser"

import type * as ESTree from "@oxc-project/types"

import { mergeJsxAttributes } from "./transform-jsx"

const JSX_PRINTER = tsx()

export function createInlineSvgElement(
  inlineSvg: ESTree.JSXElement | undefined,
  iconName: string,
  attributes: readonly ESTree.JSXAttributeItem[]
): string {
  if (!inlineSvg) {
    throw new Error(`Missing inline SVG AST for "${iconName}"`)
  }

  const clonedSvg = cloneStaticJsxNode(inlineSvg)
  clonedSvg.openingElement.attributes = mergeJsxAttributes(
    clonedSvg.openingElement.attributes,
    structuredClone([...attributes])
  )

  return print(clonedSvg as never, JSX_PRINTER).code
}

export function parseInlineSvg(iconPath: string, fromFile: string): ESTree.JSXElement {
  const rawSvg = readRawSvg(iconPath)
  const result = parseSync(iconPath, rawSvg, {
    lang: "tsx",
    sourceType: "module",
    astType: "ts",
    range: true,
  })

  const statement = result.program.body[0]

  if (!statement || statement.type !== "ExpressionStatement" || statement.expression.type !== "JSXElement") {
    throw new Error(`Could not parse inline SVG for "${iconPath}" referenced from "${fromFile}"`)
  }

  const expression = statement.expression
  if (expression.openingElement.name.type !== "JSXIdentifier" || expression.openingElement.name.name !== "svg") {
    throw new Error(`Expected root <svg> element in "${iconPath}" referenced from "${fromFile}"`)
  }

  return cloneStaticJsxNode(expression)
}

export function cloneStaticJsxNode(node: ESTree.JSXElement): ESTree.JSXElement {
  return structuredClone(node)
}

function readRawSvg(iconPath: string): string {
  return readFileSync(iconPath, "utf8").trim()
}
