import type { StreamlineCompileIconProps } from "./types"

function compileOnly(name: string): never {
  throw new Error(`${name} must be compiled away by vite-plugin-streamline.`)
}

export function Icon(_props: StreamlineCompileIconProps): null {
  compileOnly("Icon")
}

export function icon(_strings: TemplateStringsArray, ..._values: never[]): null {
  compileOnly("icon")
}
