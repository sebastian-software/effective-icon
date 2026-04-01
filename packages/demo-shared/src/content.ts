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
  defaultTint: string
  differences: [string, string, string]
  lead: string
  liveElement: string
  outputSnippet: string
  renderMode: string
  supportsRuntimeTinting: boolean
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

export const authoringSnippet = `import { Icon, icon } from "vite-plugin-streamline/compile"

const view = (
  <section>
    <Icon name="airplane" className="demo-icon" />
    {icon\`add-1\`}
    <Icon name="anchor" aria-label="Anchor" />
  </section>
)`

export const liveExamples: DemoLiveExample[] = [
  {
    code: `<Icon name="airplane" className="demo-icon" aria-hidden="true" />`,
    label: "JSX marker",
    title: "airplane",
  },
  {
    code: `{icon\`add-1\`}`,
    label: "Tagged template",
    title: "add-1",
  },
  {
    code: `<Icon name="anchor" className="demo-icon" aria-label="Anchor" />`,
    label: "JSX marker",
    title: "anchor",
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
      "This target emits external SVG URLs inside <img>. The picker stays visible here, but <img> does not forward runtime currentColor into the SVG file. Switch to JSX mask, JSX inline SVG, or web component to see the tint applied to the icon itself.",
    defaultTint: "#dc5a29",
    differences: [
      "Asset import: `icon.svg?url`",
      "Emitted element: `<img src={asset}>`",
      "Extra runtime: none",
    ],
    lead: "Statically imports SVG URLs and rewrites markers to image-style JSX output.",
    liveElement: "<img>",
    outputSnippet: `import __streamlineIconAsset0 from "@streamline-pkg/core-line-free/icons/airplane.svg?url"

const view = <img className="demo-icon" src={__streamlineIconAsset0} aria-hidden="true" />`,
    renderMode: "jsx / image",
    supportsRuntimeTinting: false,
    title: "JSX image output",
  },
  mask: {
    colorNote: "This target renders a <span> with mask-image styles and background-color: currentColor. The picker updates the live icons without changing the authored source.",
    defaultTint: "#2f7df4",
    differences: [
      "Asset import: `icon.svg?url`",
      "Emitted element: `<span style={buildStreamlineMaskStyle(asset)}>`",
      "Extra runtime: mask style helper",
    ],
    lead: "Keeps static asset imports and renders via mask-image styling on a span.",
    liveElement: "<span>",
    outputSnippet: `import __streamlineIconAsset0 from "@streamline-pkg/core-line-free/icons/airplane.svg?url"
import { buildStreamlineMaskStyle as __streamlineBuildMaskStyle } from "vite-plugin-streamline/runtime"

const view = <span className="demo-icon" style={__streamlineBuildMaskStyle(__streamlineIconAsset0)} />`,
    renderMode: "jsx / mask",
    supportsRuntimeTinting: true,
    title: "JSX mask output",
  },
  "inline-svg": {
    colorNote:
      "This target emits the SVG markup directly into JSX. The picker changes currentColor on the real <svg> element, so fill and stroke respond without any wrapper runtime.",
    defaultTint: "#8b5cf6",
    differences: [
      "Asset import: none",
      "Emitted element: inline `<svg ...>` markup",
      "Extra runtime: none",
    ],
    lead: "Inlines the source SVG directly into JSX so the resulting DOM contains a real svg element.",
    liveElement: "<svg>",
    outputSnippet: `const view = (
  <svg className="demo-icon" aria-hidden="true" viewBox="0 0 14 14" fill="none">
    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="..." />
  </svg>
)`,
    renderMode: "jsx / inline-svg",
    supportsRuntimeTinting: true,
    title: "JSX inline SVG output",
  },
  "web-component": {
    colorNote:
      "This target renders <streamline-icon> and passes an external SVG asset URL into the custom element. Inside the shadow DOM it renders a mask-based glyph, so the host still tints through currentColor without embedding raw SVG strings in the JS bundle.",
    defaultTint: "#1f9d63",
    differences: [
      "Asset import: `icon.svg?url`",
      "Emitted element: `<streamline-icon data-streamline-url={asset}>`",
      "Extra runtime: custom-element mask renderer",
    ],
    lead: "Keeps the icon as an external asset URL and lets the custom element render it via a tintable mask in shadow DOM.",
    liveElement: "<streamline-icon>",
    outputSnippet: `import __streamlineIconAsset0 from "@streamline-pkg/core-line-free/icons/airplane.svg?url"
import { ensureStreamlineIconElement } from "vite-plugin-streamline/runtime"

ensureStreamlineIconElement()

const view = <streamline-icon data-streamline-url={__streamlineIconAsset0} />`,
    renderMode: "web-component",
    supportsRuntimeTinting: true,
    title: "Web component output",
  },
}
