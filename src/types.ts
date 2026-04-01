export type IconTarget = "jsx" | "web-component"

export type IconRenderMode = "image" | "component" | "mask" | "inline-svg"

export interface IconkitVitePluginOptions {
  package: string
  target?: IconTarget
  renderMode?: IconRenderMode
  typesOutputFile?: string | false
}

export interface IconPackManifestIcon {
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

export interface IconPackManifest {
  name: string
  slug: string
  version: string
  license: string
  sourceUrl: string
  family: string
  style: string
  iconCount: number
  icons: IconPackManifestIcon[]
}
