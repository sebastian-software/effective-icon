import { print } from "esrap"
import tsx from "esrap/languages/tsx"

import type * as ESTree from "@oxc-project/types"

const JSX_PRINTER = tsx()

export function findNameAttribute(
  attributes: readonly ESTree.JSXAttributeItem[]
): ESTree.JSXAttribute | undefined {
  return attributes.find(
    (attribute): attribute is ESTree.JSXAttribute =>
      attribute.type === "JSXAttribute" && getJsxAttributeIdentifier(attribute.name) === "name"
  )
}

export function getJsxTagName(node: ESTree.JSXElement): string {
  return getJsxElementName(node.openingElement.name)
}

export function getJsxAttributeName(attribute: ESTree.JSXAttributeItem): string | null {
  if (attribute.type !== "JSXAttribute") {
    return null
  }

  return getJsxAttributeIdentifier(attribute.name)
}

export function getJsxAttributeExpression(
  attributes: readonly ESTree.JSXAttributeItem[],
  name: string
): ESTree.Expression | undefined {
  const attribute = attributes.find(
    (candidate): candidate is ESTree.JSXAttribute =>
      candidate.type === "JSXAttribute" && getJsxAttributeIdentifier(candidate.name) === name
  )

  if (!attribute?.value) {
    return undefined
  }

  if (attribute.value.type === "Literal") {
    return attribute.value
  }

  if (attribute.value.type === "JSXExpressionContainer" && attribute.value.expression.type !== "JSXEmptyExpression") {
    return attribute.value.expression
  }

  return undefined
}

export function getJsxAttributeExpressionSource(
  attributes: readonly ESTree.JSXAttributeItem[],
  name: string,
  source: string
): string | undefined {
  const expression = getJsxAttributeExpression(attributes, name)
  if (!expression) {
    return undefined
  }

  return getNodeSource(expression, source) ?? printNode(expression)
}

export function mergeJsxAttributes(
  existing: readonly ESTree.JSXAttributeItem[],
  forwarded: readonly ESTree.JSXAttributeItem[]
): ESTree.JSXAttributeItem[] {
  const merged: ESTree.JSXAttributeItem[] = []
  const indexByName = new Map<string, number>()

  for (const attribute of [...existing, ...forwarded]) {
    const name = getJsxAttributeName(attribute)

    if (!name) {
      merged.push(attribute)
      continue
    }

    const existingIndex = indexByName.get(name)
    if (existingIndex == null) {
      indexByName.set(name, merged.length)
      merged.push(attribute)
      continue
    }

    merged[existingIndex] = attribute
  }

  return merged
}

export function renderJsxAttribute(attribute: ESTree.JSXAttributeItem, source = ""): string {
  const exact = getNodeSource(attribute, source)
  if (exact) {
    return exact
  }

  if (attribute.type === "JSXSpreadAttribute") {
    return `{...${printNode(attribute.argument)}}`
  }

  const name = renderJsxAttributeName(attribute.name, source)
  if (!attribute.value) {
    return name
  }

  return `${name}=${renderJsxAttributeValue(attribute.value, source)}`
}

export function renderJsxAttributes(attributes: readonly ESTree.JSXAttributeItem[], source = ""): string[] {
  return attributes.map((attribute) => renderJsxAttribute(attribute, source))
}

export function appendClassName(attribute: ESTree.JSXAttribute, source: string, className: string): string {
  const attributeName = getJsxAttributeIdentifier(attribute.name)

  if (!attribute.value) {
    return `${attributeName}=${JSON.stringify(className)}`
  }

  if (attribute.value.type === "Literal" && typeof attribute.value.value === "string") {
    return `${attributeName}=${JSON.stringify(`${attribute.value.value} ${className}`)}`
  }

  if (attribute.value.type === "JSXExpressionContainer" && attribute.value.expression.type !== "JSXEmptyExpression") {
    const expressionSource = getNodeSource(attribute.value.expression, source) ?? printNode(attribute.value.expression)
    return `${attributeName}={[${expressionSource}, ${JSON.stringify(className)}].filter(Boolean).join(" ")}`
  }

  return renderJsxAttribute(attribute, source)
}

export function styleTargetToClassPropName(styleTarget: "object" | "string"): "class" | "className" {
  return styleTarget === "string" ? "class" : "className"
}

export function createA11yFallback(attributes: readonly ESTree.JSXAttributeItem[]): ESTree.JSXAttribute[] {
  const names = new Set(attributes.map((attribute) => getJsxAttributeName(attribute)).filter(Boolean))
  if (names.has("aria-hidden") || names.has("aria-label") || names.has("aria-labelledby") || names.has("role")) {
    return []
  }

  return [createStringAttribute("aria-hidden", "true")]
}

export function createImageFallback(attributes: readonly ESTree.JSXAttributeItem[]): ESTree.JSXAttribute[] {
  const names = new Set(attributes.map((attribute) => getJsxAttributeName(attribute)).filter(Boolean))
  const fallback: ESTree.JSXAttribute[] = []

  if (!names.has("alt")) {
    fallback.push(createStringAttribute("alt", ""))
  }

  return [...fallback, ...createA11yFallback(attributes)]
}

export function createStringAttribute(name: string, value: string): ESTree.JSXAttribute {
  return {
    type: "JSXAttribute",
    name: createJsxIdentifier(name),
    value: createStringLiteral(value),
    start: 0,
    end: 0,
    range: [0, 0],
  }
}

export function getJsxAttributeIdentifier(name: ESTree.JSXAttributeName): string {
  if (name.type === "JSXIdentifier") {
    return name.name
  }

  return `${name.namespace.name}:${name.name.name}`
}

export function getNodeSource(node: Pick<ESTree.Span, "start" | "end">, source: string): string | null {
  if (!source || node.end <= node.start) {
    return null
  }

  return source.slice(node.start, node.end)
}

export function printNode(node: object): string {
  return print(node as never, JSX_PRINTER).code
}

function getJsxElementName(name: ESTree.JSXElementName): string {
  if (name.type === "JSXIdentifier") {
    return name.name
  }

  if (name.type === "JSXNamespacedName") {
    return `${name.namespace.name}:${name.name.name}`
  }

  return `${getJsxElementName(name.object)}.${name.property.name}`
}

function renderJsxAttributeName(name: ESTree.JSXAttributeName, source: string): string {
  const exact = getNodeSource(name, source)
  if (exact) {
    return exact
  }

  return getJsxAttributeIdentifier(name)
}

function renderJsxAttributeValue(value: ESTree.JSXAttributeValue, source: string): string {
  const exact = getNodeSource(value, source)
  if (exact) {
    return exact
  }

  return printNode(value)
}

function createJsxIdentifier(name: string): ESTree.JSXIdentifier {
  return {
    type: "JSXIdentifier",
    name,
    start: 0,
    end: 0,
    range: [0, 0],
  }
}

function createStringLiteral(value: string): ESTree.StringLiteral {
  return {
    type: "Literal",
    value,
    raw: JSON.stringify(value),
    start: 0,
    end: 0,
    range: [0, 0],
  } as ESTree.StringLiteral
}
