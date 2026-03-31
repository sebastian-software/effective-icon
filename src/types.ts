export type StreamlineIconStyle = "light" | "regular" | "bold"

export interface StreamlineIconAsset {
  name: string
  style: StreamlineIconStyle
  path?: string
  svg?: string
  origin: "api" | "archive" | "directory" | "free"
}

export interface ResolvedIconSet {
  style: StreamlineIconStyle
  icons: Map<string, StreamlineIconAsset>
}

export interface ProviderContext {
  root: string
}

export interface FreeSourceOptions {
  type: "free"
  assetsDir?: string
}

export interface DirectorySourceOptions {
  type: "directory"
  path: string
}

export interface ArchiveSourceOptions {
  type: "archive"
  path: string
}

export interface ApiManifestItem {
  name: string
  style: StreamlineIconStyle
  url: string
}

export interface ApiSourceOptions {
  type: "api"
  baseUrl: string
  headers?: Record<string, string>
}

export type StreamlineIconSourceOptions =
  | FreeSourceOptions
  | DirectorySourceOptions
  | ArchiveSourceOptions
  | ApiSourceOptions

export interface StreamlineIconsOptions {
  source?: StreamlineIconSourceOptions
  style?: StreamlineIconStyle
}

export interface StreamlineIconModule {
  name: string
  style: StreamlineIconStyle
  svg: string
}
