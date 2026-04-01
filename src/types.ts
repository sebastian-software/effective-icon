export type StreamlineIconsTarget = "jsx" | "web-component"

export type StreamlineIconsRenderMode = "component" | "mask"

export interface StreamlineIconsOptions {
  package: string
  target?: StreamlineIconsTarget
  renderMode?: StreamlineIconsRenderMode
}

export interface StreamlinePackManifestIcon {
  name: string
  file: string
  originalName: string
  sourcePageUrl: string
  category: string
  categorySlug: string
  subcategory: string
  subcategorySlug: string
  tags: string[]
}

export interface StreamlinePackManifest {
  name: string
  slug: string
  version: string
  license: string
  sourceUrl: string
  family: string
  style: string
  iconCount: number
  icons: StreamlinePackManifestIcon[]
}

export interface StreamlineCompileIconProps {
  name: string
  [key: string]: unknown
}
