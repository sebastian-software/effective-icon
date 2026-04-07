export interface RegistryEntry {
  slug: string
  packageName: `@icon-pkg/${string}`
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
  tags?: string[]
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
  familyDescription?: string
  gridSize?: number
  gridLabel?: string
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
    tags?: string[]
  }>
}

export interface DiscoveredSetData {
  slug: string
  packageName: string
  setPageUrl: string
  family: string
  style: string
  license: string
  attributionUrl: string
  sourceUrl: string
  familyGroupSlug: string
  familyName: string
  familyDescription: string | null
  icons: DiscoveredIcon[]
}

export interface DiscoveredIcon {
  hash: string
  name: string
  category?: string
  categorySlug?: string
  subcategory?: string
  subcategorySlug?: string
  sourcePageUrl?: string
  svg?: string
  svgUrlCandidates?: string[]
  tags?: string[]
}

export interface BuilderApiClient {
  discoverSet(entry: RegistryEntry): Promise<DiscoveredSetData>
  getIconDetails(hash: string): Promise<DiscoveredIcon | null>
}

export interface ApiFamilyGroup {
  hash?: string
  slug: string
  name: string
}

export interface ApiFamilyGroupMember {
  hash?: string
  slug: string
  name: string
  description?: string
}

export interface IconDetails extends DiscoveredIcon {}
