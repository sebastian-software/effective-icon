export const EFFECTIVE_ICON_MASK_CLASS_NAME = "effective-icon-mask"
export const EFFECTIVE_ICON_MASK_IMAGE_VAR_NAME = "--effective-icon-mask-image"

export type IconStyleValue = Record<string, unknown> | undefined
export type IconStyleStringValue = Record<string, unknown> | string | undefined

export function buildIconMaskStyle(iconUrl: string, style?: IconStyleValue): Record<string, unknown> {
  const baseStyle: Record<string, unknown> = {
    [EFFECTIVE_ICON_MASK_IMAGE_VAR_NAME]: `url("${iconUrl}")`,
  }

  if (!style || typeof style !== "object") {
    return baseStyle
  }

  return {
    ...baseStyle,
    ...style,
  }
}

export function buildIconMaskStyleString(iconUrl: string, style?: IconStyleStringValue): string {
  const baseStyle = `${EFFECTIVE_ICON_MASK_IMAGE_VAR_NAME}:url("${iconUrl}");`

  if (typeof style === "string") {
    return `${baseStyle}${style}`
  }

  if (!style || typeof style !== "object") {
    return baseStyle
  }

  return `${baseStyle}${Object.entries(style)
    .map(([property, value]) => `${toKebabCase(property)}:${String(value)};`)
    .join("")}`
}

function toKebabCase(property: string): string {
  if (property.startsWith("--")) {
    return property
  }

  if (property.startsWith("Webkit")) {
    return `-webkit-${camelToKebab(property.slice("Webkit".length))}`
  }

  return camelToKebab(property)
}

function camelToKebab(property: string): string {
  return property
    .replace(/^[A-Z]/, (character) => character.toLowerCase())
    .replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`)
}
