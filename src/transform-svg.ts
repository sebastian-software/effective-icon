import { readFileSync } from "node:fs"

import ts from "typescript"

import { mergeJsxAttributes } from "./transform-jsx"

export function createInlineSvgElement(
  inlineSvg: ts.JsxElement | ts.JsxSelfClosingElement | undefined,
  iconName: string,
  attributes: readonly ts.JsxAttributeLike[]
): ts.JsxElement | ts.JsxSelfClosingElement {
  if (!inlineSvg) {
    throw new Error(`Missing inline SVG AST for "${iconName}"`)
  }

  const clonedSvg = cloneStaticJsxNode(inlineSvg)

  if (ts.isJsxElement(clonedSvg)) {
    return ts.factory.updateJsxElement(
      clonedSvg,
      ts.factory.updateJsxOpeningElement(
        clonedSvg.openingElement,
        clonedSvg.openingElement.tagName,
        clonedSvg.openingElement.typeArguments,
        ts.factory.createJsxAttributes(mergeJsxAttributes(clonedSvg.openingElement.attributes.properties, attributes))
      ),
      clonedSvg.children,
      clonedSvg.closingElement
    )
  }

  return ts.factory.updateJsxSelfClosingElement(
    clonedSvg,
    clonedSvg.tagName,
    clonedSvg.typeArguments,
    ts.factory.createJsxAttributes(mergeJsxAttributes(clonedSvg.attributes.properties, attributes))
  )
}

export function parseInlineSvg(iconPath: string, fromFile: string): ts.JsxElement | ts.JsxSelfClosingElement {
  const rawSvg = readRawSvg(iconPath)
  const source = ts.createSourceFile(
    `${iconPath}.tsx`,
    `const __streamlineInlineIcon = (${rawSvg});`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  )
  const statement = source.statements[0]

  if (!statement || !ts.isVariableStatement(statement)) {
    throw new Error(`Could not parse inline SVG for "${iconPath}" referenced from "${fromFile}"`)
  }

  const initializer = statement.declarationList.declarations[0]?.initializer
  const expression = initializer && ts.isParenthesizedExpression(initializer) ? initializer.expression : initializer

  if (!expression || (!ts.isJsxElement(expression) && !ts.isJsxSelfClosingElement(expression))) {
    throw new Error(`Expected root <svg> element in "${iconPath}" referenced from "${fromFile}"`)
  }

  const tagName = ts.isJsxElement(expression) ? expression.openingElement.tagName : expression.tagName
  if (!ts.isIdentifier(tagName) || tagName.text !== "svg") {
    throw new Error(`Expected root <svg> element in "${iconPath}" referenced from "${fromFile}"`)
  }

  return cloneStaticJsxNode(expression)
}

export function cloneStaticJsxNode(
  node: ts.JsxElement | ts.JsxSelfClosingElement
): ts.JsxElement | ts.JsxSelfClosingElement {
  if (ts.isJsxElement(node)) {
    return ts.factory.createJsxElement(
      ts.factory.createJsxOpeningElement(
        cloneJsxTagName(node.openingElement.tagName),
        undefined,
        ts.factory.createJsxAttributes(node.openingElement.attributes.properties.map(cloneJsxAttributeLike))
      ),
      node.children.map(cloneJsxChild),
      ts.factory.createJsxClosingElement(cloneJsxTagName(node.closingElement.tagName))
    )
  }

  return ts.factory.createJsxSelfClosingElement(
    cloneJsxTagName(node.tagName),
    undefined,
    ts.factory.createJsxAttributes(node.attributes.properties.map(cloneJsxAttributeLike))
  )
}

function readRawSvg(iconPath: string): string {
  return readFileSync(iconPath, "utf8").trim()
}

function cloneJsxChild(child: ts.JsxChild): ts.JsxChild {
  if (ts.isJsxText(child)) {
    return ts.factory.createJsxText(child.getText())
  }

  if (ts.isJsxElement(child)) {
    return cloneStaticJsxNode(child)
  }

  if (ts.isJsxSelfClosingElement(child)) {
    return cloneStaticJsxNode(child)
  }

  if (ts.isJsxExpression(child)) {
    return ts.factory.createJsxExpression(undefined, child.expression)
  }

  if (ts.isJsxFragment(child)) {
    return ts.factory.createJsxFragment(
      ts.factory.createJsxOpeningFragment(),
      child.children.map(cloneJsxChild),
      ts.factory.createJsxJsxClosingFragment()
    )
  }

  return child
}

function cloneJsxAttributeLike(attribute: ts.JsxAttributeLike): ts.JsxAttributeLike {
  if (ts.isJsxSpreadAttribute(attribute)) {
    return ts.factory.createJsxSpreadAttribute(attribute.expression)
  }

  return ts.factory.createJsxAttribute(
    cloneJsxAttributeName(attribute.name),
    cloneJsxAttributeInitializer(attribute.initializer)
  )
}

function cloneJsxAttributeInitializer(
  initializer: ts.JsxAttribute["initializer"]
): ts.StringLiteral | ts.JsxExpression | ts.JsxElement | ts.JsxSelfClosingElement | ts.JsxFragment | undefined {
  if (!initializer) {
    return undefined
  }

  if (ts.isStringLiteral(initializer)) {
    return ts.factory.createStringLiteral(initializer.text)
  }

  if (ts.isJsxExpression(initializer)) {
    return ts.factory.createJsxExpression(undefined, initializer.expression)
  }

  if (ts.isJsxElement(initializer) || ts.isJsxSelfClosingElement(initializer)) {
    return cloneStaticJsxNode(initializer)
  }

  return ts.factory.createJsxFragment(
    ts.factory.createJsxOpeningFragment(),
    initializer.children.map(cloneJsxChild),
    ts.factory.createJsxJsxClosingFragment()
  )
}

function cloneJsxAttributeName(name: ts.JsxAttributeName): ts.JsxAttributeName {
  if (ts.isIdentifier(name)) {
    return ts.factory.createIdentifier(name.text)
  }

  return ts.factory.createJsxNamespacedName(
    ts.factory.createIdentifier(name.namespace.text),
    ts.factory.createIdentifier(name.name.text)
  )
}

function cloneJsxTagName(name: ts.JsxTagNameExpression): ts.JsxTagNameExpression {
  if (ts.isIdentifier(name)) {
    return ts.factory.createIdentifier(name.text)
  }

  if (ts.isJsxNamespacedName(name)) {
    return ts.factory.createJsxNamespacedName(
      ts.factory.createIdentifier(name.namespace.text),
      ts.factory.createIdentifier(name.name.text)
    )
  }

  if (ts.isPropertyAccessExpression(name)) {
    return ts.factory.createPropertyAccessExpression(
      cloneJsxTagName(name.expression) as ts.Identifier | ts.ThisExpression | ts.JsxTagNamePropertyAccess,
      ts.factory.createIdentifier(name.name.text)
    ) as unknown as ts.JsxTagNamePropertyAccess
  }

  return ts.factory.createThis()
}
