export type IconSurface = "jsx"

export type IconRenderMode = "image" | "component" | "mask" | "svg"

export interface EffectiveIconVitePluginOptions {
  package: string
  surface?: IconSurface
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
  familyDescription?: string
  gridSize?: number
  gridLabel?: string
  iconCount: number
  icons: IconPackManifestIcon[]
}
