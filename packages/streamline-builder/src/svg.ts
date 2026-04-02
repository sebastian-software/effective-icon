import { optimize, type Config } from "svgo"

import { normalizeSvgToCurrentColor } from "./normalize"

const SVGO_CONFIG: Config = {
  multipass: true,
  plugins: [
    {
      name: "preset-default",
      params: {
        overrides: {
          cleanupIds: false,
        },
      },
    },
    "sortAttrs",
  ],
}

const FORBIDDEN_TAGS = ["defs", "foreignObject", "script", "style", "title", "desc"] as const
const FORBIDDEN_ROOT_ATTRIBUTES = ["width", "height", "class", "style", "role", "focusable", "tabindex"] as const

interface SvgContext {
  iconName?: string
  packSlug?: string
}

export function preparePackSvg(svg: string, context: SvgContext = {}): string {
  const normalized = normalizeSvgSource(svg)
  validatePackSvg(normalized, context)
  const optimized = optimize(normalized, {
    ...SVGO_CONFIG,
    path: buildSvgPath(context),
  })

  return validatePackSvg(optimized.data, context)
}

export function validatePackSvg(svg: string, context: SvgContext = {}): string {
  const trimmed = svg.trim()

  if (!trimmed.startsWith("<svg")) {
    throw createSvgError("Expected root <svg> element", context)
  }

  const rootTag = trimmed.match(/^<svg\b[^>]*>/)?.[0]
  if (!rootTag) {
    throw createSvgError("Could not read root <svg> tag", context)
  }

  for (const attribute of FORBIDDEN_ROOT_ATTRIBUTES) {
    if (new RegExp(`\\s${attribute}\\s*=`, "i").test(rootTag)) {
      throw createSvgError(`Forbidden root <svg> attribute "${attribute}"`, context)
    }
  }

  if (/\saria-[\w-]+\s*=/i.test(rootTag)) {
    throw createSvgError('Forbidden root <svg> accessibility attribute "aria-*"', context)
  }

  if (/\sid\s*=/i.test(trimmed)) {
    throw createSvgError('Forbidden SVG attribute "id"', context)
  }

  if (/url\s*\(#/i.test(trimmed)) {
    throw createSvgError('Forbidden SVG reference "url(#...)"', context)
  }

  if (/\sxlink:href\s*=\s*["']#/i.test(trimmed) || /\shref\s*=\s*["']#/i.test(trimmed)) {
    throw createSvgError('Forbidden SVG reference "#..."', context)
  }

  if (/\son[a-z]+\s*=/i.test(trimmed)) {
    throw createSvgError("Forbidden inline event handler in SVG", context)
  }

  for (const tag of FORBIDDEN_TAGS) {
    if (new RegExp(`<${tag}\\b`, "i").test(trimmed)) {
      throw createSvgError(`Forbidden SVG element <${tag}>`, context)
    }
  }

  return trimmed
}

function normalizeSvgSource(svg: string): string {
  return stripRootSvgAttributes(
    stripElements(
      stripXmlArtifacts(normalizeSvgToCurrentColor(svg))
    )
  ).trim()
}

function stripXmlArtifacts(svg: string): string {
  return svg
    .replace(/^\uFEFF/, "")
    .replace(/<\?xml[\s\S]*?\?>/gi, "")
    .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
}

function stripElements(svg: string): string {
  return svg
    .replace(/<!--([\s\S]*?)-->/g, "")
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, "")
    .replace(/<desc\b[^>]*>[\s\S]*?<\/desc>/gi, "")
}

function stripRootSvgAttributes(svg: string): string {
  return svg.replace(/<svg\b([^>]*)>/i, (match, rawAttributes: string) => {
    let nextAttributes = rawAttributes

    nextAttributes = nextAttributes.replace(/\s(width|height|class|style|role|focusable|tabindex)\s*=\s*(".*?"|'.*?')/gi, "")
    nextAttributes = nextAttributes.replace(/\saria-[\w-]+\s*=\s*(".*?"|'.*?')/gi, "")

    return `<svg${nextAttributes}>`
  })
}

function createSvgError(message: string, context: SvgContext): Error {
  if (!context.packSlug && !context.iconName) {
    return new Error(message)
  }

  const label = [context.packSlug, context.iconName].filter(Boolean).join("/")
  return new Error(`${message} in "${label}"`)
}

function buildSvgPath(context: SvgContext): string {
  const packSlug = context.packSlug ?? "unknown-pack"
  const iconName = context.iconName ?? "unknown-icon"
  return `${packSlug}/${iconName}.svg`
}
