export type DemoVariantKey = "image" | "mask" | "inline-svg" | "web-component"

interface DemoPackInfo {
  family: string
  iconCount: number
  license: string
  packageName: string
  sourceUrl: string
  style: string
  version: string
}

interface DemoLinkMap {
  image: string
  mask: string
  "inline-svg": string
  "web-component": string
}

interface DemoVariantDefinition {
  colorNote: string
  componentOutput: string
  defaultTint: string
  differences: [string, string, string]
  inlineOutput: string
  lead: string
  liveElement: string
  renderMode: string
  supportsRuntimeTinting: boolean
  tabLabel: string
  title: string
}

interface DemoLiveExample {
  code: string
  label: string
  title: string
}

declare const __STREAMLINE_DEMO_PACK_INFO__: DemoPackInfo
declare const __STREAMLINE_DEMO_LINKS__: DemoLinkMap

export const packInfo = __STREAMLINE_DEMO_PACK_INFO__
export const demoLinks = __STREAMLINE_DEMO_LINKS__

export const componentSource = `import { Icon } from "@effective/icon/compile"

function StatusBar() {
  return <Icon name="airplane" />
}`

export const inlineSource = `import { icon } from "@effective/icon/compile"

function Toolbar() {
  return <Button startIcon={icon\`magic-wand-2\`}>Transform</Button>
}`

export const liveExamples: DemoLiveExample[] = [
  {
    code: `<Icon name="airplane" />`,
    label: "Standalone component",
    title: "airplane",
  },
  {
    code: `startIcon={icon\`magic-wand-2\`}`,
    label: "As prop value",
    title: "magic-wand-2",
  },
] as const

export const runtimeTintPalette = ["#dc5a29", "#2f7df4", "#1f9d63", "#8b5cf6", "#171717"] as const

export const failureCases = [
  'Unknown icon names fail the build immediately.',
  'Compile-time <Icon> requires name="literal".',
  "Template-tag usage does not support interpolation.",
  "Spread props and children are rejected.",
] as const

export const variantDefinitions: Record<DemoVariantKey, DemoVariantDefinition> = {
  image: {
    colorNote:
      "Emits external SVG URLs as img elements — runtime tinting not supported. Switch to mask or inline SVG to tint.",
    componentOutput: `import __s from ".../airplane.svg?url"

function StatusBar() {
  return <img src={__s} />
}`,
    defaultTint: "#dc5a29",
    differences: [
      "Asset import: `icon.svg?url`",
      "Emitted element: `<img src={asset}>`",
      "Extra runtime: none",
    ],
    inlineOutput: `import __s from ".../magic-wand-2.svg?url"

function Toolbar() {
  return <Button startIcon={<img src={__s} />}>Transform</Button>
}`,
    lead: "Rewrites compile-time markers to static img elements referencing external SVG assets.",
    liveElement: "<img>",
    renderMode: "jsx / image",
    supportsRuntimeTinting: false,
    tabLabel: "External SVG",
    title: "External SVG output",
  },
  mask: {
    colorNote: "Renders a span with mask-image and currentColor — tint updates live.",
    componentOutput: `import __s from ".../airplane.svg?url"
import { buildIconMaskStyle as __mask }
  from "@effective/icon/runtime"

function StatusBar() {
  return <span style={__mask(__s)} />
}`,
    defaultTint: "#2f7df4",
    differences: [
      "Asset import: `icon.svg?url`",
      "Emitted element: `<span style={mask(asset)}>`",
      "Extra runtime: mask style helper",
    ],
    inlineOutput: `import __s from ".../magic-wand-2.svg?url"
import { buildIconMaskStyle as __mask }
  from "@effective/icon/runtime"

function Toolbar() {
  return <Button startIcon={<span style={__mask(__s)} />}>Transform</Button>
}`,
    lead: "Uses mask-image on a span so icons tint through currentColor without inlining SVG.",
    liveElement: "<span>",
    renderMode: "jsx / mask",
    supportsRuntimeTinting: true,
    tabLabel: "CSS Mask",
    title: "CSS mask output",
  },
  "inline-svg": {
    colorNote:
      "Inlines SVG markup directly — fill and stroke respond to currentColor.",
    componentOutput: `function StatusBar() {
  return (
    <svg viewBox="0 0 14 14" fill="none">
      <path stroke="currentColor" d="M9.54..." />
    </svg>
  )
}`,
    defaultTint: "#8b5cf6",
    differences: [
      "Asset import: none",
      "Emitted element: inline `<svg ...>` markup",
      "Extra runtime: none",
    ],
    inlineOutput: `function Toolbar() {
  return (
    <Button startIcon={
      <svg viewBox="0 0 14 14" fill="none">
        <path stroke="currentColor" d="M13.5..." />
      </svg>
    }>Transform</Button>
  )
}`,
    lead: "Inlines SVG markup directly into JSX — zero runtime, full currentColor support.",
    liveElement: "<svg>",
    renderMode: "jsx / inline-svg",
    supportsRuntimeTinting: true,
    tabLabel: "Inline SVG",
    title: "Inline SVG output",
  },
  "web-component": {
    colorNote:
      "Renders a custom element with shadow DOM mask — tints via currentColor, no inline SVG.",
    componentOutput: `import __s from ".../airplane.svg?url"
import { ensureIconElement }
  from "@effective/icon/runtime"
ensureIconElement()

function StatusBar() {
  return <effective-icon data-icon-url={__s} />
}`,
    defaultTint: "#1f9d63",
    differences: [
      "Asset import: `icon.svg?url`",
      "Emitted element: `<effective-icon>`",
      "Extra runtime: custom-element mask renderer",
    ],
    inlineOutput: `import __s from ".../magic-wand-2.svg?url"
import { ensureIconElement }
  from "@effective/icon/runtime"
ensureIconElement()

function Toolbar() {
  return (
    <Button startIcon={
      <effective-icon data-icon-url={__s} />
    }>Transform</Button>
  )
}`,
    lead: "Renders a custom element with shadow DOM mask for tintable icons without inlining SVG.",
    liveElement: "<effective-icon>",
    renderMode: "web-component",
    supportsRuntimeTinting: true,
    tabLabel: "Web Component",
    title: "Web component output",
  },
}
