export interface RegistryEntry {
  slug: string
  packageName: `@streamline-pkg/${string}`
  setPageUrl: string
  family: string
  style: string
  license: string
  attributionUrl: string
  enabled: boolean
}

export interface RawFamilyCategory {
  hash: string
  slug: string
  name: string
}

export interface RawGroupedIcon {
  hash: string
  slug: string
  name: string
  imagePublicId: string
  svg: string
  url: string
  familySlug: string
  subcategoryHash: string
  subcategoryName: string
  isFree: boolean
  hasPremiumAccess: boolean
  strokeAllowed: boolean
  tags?: string[]
}

export interface ExtractedSetData {
  slug: string
  packageName: string
  setPageUrl: string
  family: string
  style: string
  license: string
  attributionUrl: string
  sourceUrl: string
  familyName: string
  familyDescription: string | null
  iconCount: number
  icons: ExtractedIcon[]
}

export interface ExtractedIcon {
  name: string
  file: string
  originalName: string
  sourcePageUrl: string
  category: string
  categorySlug: string
  subcategory: string
  subcategorySlug: string
  tags: string[]
  svg: string
}

export interface PackManifest {
  name: string
  slug: string
  version: string
  license: string
  sourceUrl: string
  family: string
  style: string
  iconCount: number
  icons: Array<{
    name: string
    file: string
    originalName: string
    sourcePageUrl: string
    category: string
    categorySlug: string
    subcategory: string
    subcategorySlug: string
    tags: string[]
  }>
}
