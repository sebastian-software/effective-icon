export interface EffectiveIconCompileTypeRegistry {}

export type IconName = EffectiveIconCompileTypeRegistry extends {
  iconName: infer TIconName extends string
}
  ? TIconName
  : string

export interface IconCompileProps {
  name: IconName
  [key: string]: unknown
}

function compileOnly(name: string): never {
  throw new Error(`${name} must be compiled away by @effective/icon.`)
}

export function Icon(_props: IconCompileProps): null {
  compileOnly("Icon")
}

export function icon(_strings: TemplateStringsArray, ..._values: never[]): null {
  compileOnly("icon")
}
