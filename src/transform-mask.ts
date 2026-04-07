import type * as ESTree from "@oxc-project/types"

import {
  appendClassName,
  createStringAttribute,
  getJsxAttributeExpressionSource,
  getJsxAttributeName,
  renderJsxAttribute,
  renderJsxAttributes,
} from "./transform-jsx"

export const MASK_CSS_MODULE_ID = "virtual:effective-icon/mask.css"
export const MASK_CLASS_NAME = "effective-icon-mask"
export const MASK_IMAGE_VAR_NAME = "--effective-icon-mask-image"

export function createInlineMaskStyle(
  styleExpression: ESTree.Expression | undefined,
  iconImportName: string,
  styleTarget: "object" | "string",
  source: string
): string | undefined {
  const mergedProperties = mergeInlineMaskStyleObject(styleExpression, iconImportName, source)
  if (!mergedProperties) {
    return undefined
  }

  if (styleTarget === "string") {
    return mergedProperties
      .map(({ name, value }) => `${JSON.stringify(`${toCssPropertyName(name)}:`)} + (${value}) + ${JSON.stringify(";")}`)
      .join(" + ")
  }

  return `{ ${mergedProperties.map(({ property }) => property).join(", ")} }`
}

export function withMaskClass(
  attributes: readonly ESTree.JSXAttributeItem[],
  preferredName: "class" | "className",
  source: string
): string[] {
  const rendered = renderJsxAttributes(attributes, source)
  const classIndex = attributes.findIndex((attribute) => {
    const name = getJsxAttributeName(attribute)
    return name === "class" || name === "className"
  })

  if (classIndex === -1) {
    return [...rendered, renderJsxAttribute(createStringAttribute(preferredName, MASK_CLASS_NAME))]
  }

  const attribute = attributes[classIndex]
  if (attribute.type !== "JSXAttribute") {
    return rendered
  }

  const next = [...rendered]
  next[classIndex] = appendClassName(attribute, source, MASK_CLASS_NAME)
  return next
}

export function getStyleExpressionSource(
  attributes: readonly ESTree.JSXAttributeItem[],
  source: string
): string | undefined {
  return getJsxAttributeExpressionSource(attributes, "style", source)
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

interface MaskProperty {
  name: string
  property: string
  value: string
}

function mergeInlineMaskStyleObject(
  styleExpression: ESTree.Expression | undefined,
  iconImportName: string,
  source: string
): MaskProperty[] | undefined {
  const mergedProperties = new Map<string, MaskProperty>()

  const baseProperty = createMaskVariableStyle(iconImportName)
  mergedProperties.set(baseProperty.name, baseProperty)

  if (!styleExpression) {
    return [...mergedProperties.values()]
  }

  if (styleExpression.type !== "ObjectExpression") {
    return undefined
  }

  for (const property of styleExpression.properties) {
    if (property.type !== "Property" || property.kind !== "init" || property.method || property.computed) {
      return undefined
    }

    const name = getObjectLiteralPropertyName(property)
    if (!name) {
      return undefined
    }

    const propertySource = source.slice(property.start, property.end)
    const valueSource = source.slice(property.value.start, property.value.end)
    mergedProperties.set(name, {
      name,
      property: propertySource,
      value: valueSource,
    })
  }

  return [...mergedProperties.values()]
}

function createMaskVariableStyle(iconImportName: string): MaskProperty {
  const value = `\`url("\${${iconImportName}}")\``
  return {
    name: MASK_IMAGE_VAR_NAME,
    property: `${JSON.stringify(MASK_IMAGE_VAR_NAME)}: ${value}`,
    value,
  }
}

function getObjectLiteralPropertyName(property: ESTree.ObjectProperty): string | undefined {
  if (property.key.type === "Identifier") {
    return property.key.name
  }

  if (property.key.type === "Literal" && (typeof property.key.value === "string" || typeof property.key.value === "number")) {
    return String(property.key.value)
  }

  return undefined
}

function camelToKebab(value: string): string {
  return value
    .replace(/^[A-Z]/, (character) => character.toLowerCase())
    .replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`)
}
