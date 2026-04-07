import ts from "typescript"

import {
  appendClassName,
  createStringAttribute,
  getJsxAttributeName,
} from "./transform-jsx"

export const MASK_CSS_MODULE_ID = "virtual:effective-icon/mask.css"
export const MASK_CLASS_NAME = "effective-icon-mask"
export const MASK_IMAGE_VAR_NAME = "--effective-icon-mask-image"

export function createInlineMaskStyle(
  styleExpression: ts.Expression | undefined,
  iconImportName: string,
  styleTarget: "object" | "string"
): ts.Expression | undefined {
  const mergedObjectStyle = mergeInlineMaskStyleObject(styleExpression, iconImportName)
  if (!mergedObjectStyle) {
    return undefined
  }

  if (styleTarget === "string") {
    return createCssTextExpression(mergedObjectStyle)
  }

  return mergedObjectStyle
}

export function withMaskClass(
  attributes: readonly ts.JsxAttributeLike[],
  preferredName: "class" | "className"
): ts.JsxAttributeLike[] {
  const merged = [...attributes]
  const classIndex = merged.findIndex((attribute) => {
    const name = getJsxAttributeName(attribute)
    return name === "class" || name === "className"
  })

  if (classIndex === -1) {
    merged.push(createStringAttribute(preferredName, MASK_CLASS_NAME))
    return merged
  }

  merged[classIndex] = appendClassName(merged[classIndex] as ts.JsxAttribute, MASK_CLASS_NAME)
  return merged
}

export function toCssPropertyName(propertyName: string): string {
  if (propertyName.startsWith("--")) {
    return propertyName
  }

  if (propertyName.startsWith("Webkit")) {
    return `-webkit-${camelToKebab(propertyName.slice("Webkit".length))}`
  }

  return camelToKebab(propertyName)
}

function mergeInlineMaskStyleObject(
  styleExpression: ts.Expression | undefined,
  iconImportName: string
): ts.ObjectLiteralExpression | undefined {
  if (!styleExpression) {
    return createMaskVariableStyle(iconImportName)
  }

  if (!ts.isObjectLiteralExpression(styleExpression)) {
    return undefined
  }

  const baseProperties = createMaskVariableStyle(iconImportName).properties
  const mergedProperties: ts.ObjectLiteralElementLike[] = [...baseProperties]
  const indexByName = new Map<string, number>()

  for (const [index, property] of mergedProperties.entries()) {
    const name = getObjectLiteralPropertyName(property)
    if (name) {
      indexByName.set(name, index)
    }
  }

  for (const property of styleExpression.properties) {
    if (!ts.isPropertyAssignment(property)) {
      return undefined
    }

    const name = getObjectLiteralPropertyName(property)
    if (!name) {
      return undefined
    }

    const clonedProperty = ts.factory.createPropertyAssignment(clonePropertyName(property.name), property.initializer)
    const existingIndex = indexByName.get(name)

    if (existingIndex == null) {
      indexByName.set(name, mergedProperties.length)
      mergedProperties.push(clonedProperty)
      continue
    }

    mergedProperties[existingIndex] = clonedProperty
  }

  return ts.factory.createObjectLiteralExpression(mergedProperties, true)
}

function createMaskVariableStyle(iconImportName: string): ts.ObjectLiteralExpression {
  const iconUrl = ts.factory.createIdentifier(iconImportName)

  return ts.factory.createObjectLiteralExpression(
    [createObjectStyleProperty(MASK_IMAGE_VAR_NAME, createCssUrlExpression(iconUrl))],
    true
  )
}

function createObjectStyleProperty(name: string, value: ts.Expression): ts.PropertyAssignment {
  return ts.factory.createPropertyAssignment(createPropertyName(name), value)
}

function createCssUrlExpression(iconUrlExpression: ts.Expression): ts.Expression {
  return ts.factory.createTemplateExpression(ts.factory.createTemplateHead('url("'), [
    ts.factory.createTemplateSpan(iconUrlExpression, ts.factory.createTemplateTail('")')),
  ])
}

function createCssTextExpression(styleObject: ts.ObjectLiteralExpression): ts.Expression {
  return styleObject.properties.reduce<ts.Expression | undefined>((expression, property) => {
    if (!ts.isPropertyAssignment(property)) {
      return expression
    }

    const propertyName = getObjectLiteralPropertyName(property)
    if (!propertyName) {
      return expression
    }

    const propertyChunk = ts.factory.createTemplateExpression(
      ts.factory.createTemplateHead(`${toCssPropertyName(propertyName)}:`),
      [ts.factory.createTemplateSpan(property.initializer, ts.factory.createTemplateTail(";"))]
    )

    if (!expression) {
      return propertyChunk
    }

    return ts.factory.createBinaryExpression(expression, ts.SyntaxKind.PlusToken, propertyChunk)
  }, undefined) ?? ts.factory.createStringLiteral("")
}

function getObjectLiteralPropertyName(property: ts.ObjectLiteralElementLike): string | undefined {
  if (!ts.isPropertyAssignment(property)) {
    return undefined
  }

  if (ts.isIdentifier(property.name)) {
    return property.name.text
  }

  if (ts.isStringLiteral(property.name) || ts.isNumericLiteral(property.name)) {
    return property.name.text
  }

  return undefined
}

function clonePropertyName(name: ts.PropertyName): ts.PropertyName {
  if (ts.isIdentifier(name)) {
    return ts.factory.createIdentifier(name.text)
  }

  if (ts.isStringLiteral(name)) {
    return ts.factory.createStringLiteral(name.text)
  }

  if (ts.isNumericLiteral(name)) {
    return ts.factory.createNumericLiteral(name.text)
  }

  return name
}

function createPropertyName(name: string): ts.PropertyName {
  return /^[$A-Z_a-z][$\w]*$/.test(name)
    ? ts.factory.createIdentifier(name)
    : ts.factory.createStringLiteral(name)
}

function camelToKebab(value: string): string {
  return value
    .replace(/^[A-Z]/, (character) => character.toLowerCase())
    .replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`)
}
