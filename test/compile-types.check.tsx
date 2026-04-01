declare module "iconkit/compile" {
  interface IconkitCompileTypeRegistry {
    iconName: "airplane" | "anchor"
  }
}

import { Icon, type IconCompileProps, type IconName } from "iconkit/compile"

const validName: IconName = "airplane"
const validProps: IconCompileProps = { name: "anchor" }
const validElement = <Icon name="airplane" aria-hidden="true" />

// @ts-expect-error "rocket" is not part of the registered icon union
const invalidName: IconName = "rocket"

// @ts-expect-error "rocket" is not part of the registered icon union
const invalidProps: IconCompileProps = { name: "rocket" }

// @ts-expect-error "rocket" is not part of the registered icon union
const invalidElement = <Icon name="rocket" />

void validName
void validProps
void validElement
void invalidName
void invalidProps
void invalidElement
