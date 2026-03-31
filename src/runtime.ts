import type { StreamlineIconModule } from "./types"

export type StreamlineIconLoader = (name: string) => Promise<StreamlineIconModule | null>

export function defineStreamlineIconLoader(loader: StreamlineIconLoader): StreamlineIconLoader {
  return loader
}
