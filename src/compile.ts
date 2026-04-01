import type { IconCompileProps } from "./types"

function compileOnly(name: string): never {
  throw new Error(`${name} must be compiled away by iconkit.`)
}

export function Icon(_props: IconCompileProps): null {
  compileOnly("Icon")
}

export function icon(_strings: TemplateStringsArray, ..._values: never[]): null {
  compileOnly("icon")
}
