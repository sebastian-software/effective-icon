export type DemoRenderMode = "image" | "mask" | "svg"
export type DemoFramework = "react" | "solid"
export type DemoKey =
  | "react-image"
  | "react-mask"
  | "react-svg"
  | "solid-image"
  | "solid-mask"
  | "solid-svg"

interface DemoRouteBase {
  key: DemoKey
  framework: DemoFramework
  familyLabel: "React" | "Solid"
  lead: string
  modeLabel: "Image" | "Mask" | "SVG"
  navLabel: "Image" | "Mask" | "SVG"
  port: number
  renderMode: DemoRenderMode
  slug: string
  summary: string
  title: string
  workspace: string
}

export interface DemoRoute extends DemoRouteBase {
  emittedElement: "<img>" | "<span>" | "<svg>"
  runtimeLabel: string
  surface: "jsx"
}

export interface DemoNavGroup {
  label: string
  keys: DemoKey[]
}

export interface DemoNavSection {
  label: string
  groups: DemoNavGroup[]
}

export const demoKeys = [
  "react-image",
  "react-mask",
  "react-svg",
  "solid-image",
  "solid-mask",
  "solid-svg",
] as const satisfies readonly DemoKey[]

export const demoRoutes = [
  {
    key: "react-image",
    framework: "react",
    familyLabel: "React",
    surface: "jsx",
    renderMode: "image",
    modeLabel: "Image",
    navLabel: "Image",
    title: "React / Image",
    lead: "Real React + Vite consumer using `<Icon />` with image output.",
    summary: "React consumer demo with external SVG image output.",
    emittedElement: "<img>",
    runtimeLabel: "External asset URL, no runtime tinting.",
    slug: "react-image",
    workspace: "@streamline-demo/react-image",
    port: 4174,
  },
  {
    key: "react-mask",
    framework: "react",
    familyLabel: "React",
    surface: "jsx",
    renderMode: "mask",
    modeLabel: "Mask",
    navLabel: "Mask",
    title: "React / Mask",
    lead: "Real React + Vite consumer using `<Icon />` with mask output.",
    summary: "React consumer demo with currentColor-driven mask output.",
    emittedElement: "<span>",
    runtimeLabel: "Mask helper runtime, tintable via currentColor.",
    slug: "react-mask",
    workspace: "@streamline-demo/react-mask",
    port: 4175,
  },
  {
    key: "react-svg",
    framework: "react",
    familyLabel: "React",
    surface: "jsx",
    renderMode: "svg",
    modeLabel: "SVG",
    navLabel: "SVG",
    title: "React / SVG",
    lead: "Real React + Vite consumer using `<Icon />` with inline SVG output.",
    summary: "React consumer demo with inline SVG output.",
    emittedElement: "<svg>",
    runtimeLabel: "No asset URL and no helper runtime.",
    slug: "react-svg",
    workspace: "@streamline-demo/react-svg",
    port: 4176,
  },
  {
    key: "solid-image",
    framework: "solid",
    familyLabel: "Solid",
    surface: "jsx",
    renderMode: "image",
    modeLabel: "Image",
    navLabel: "Image",
    title: "Solid / Image",
    lead: "Real Solid + Vite consumer using `<Icon />` with image output.",
    summary: "Solid consumer demo with external SVG image output.",
    emittedElement: "<img>",
    runtimeLabel: "External asset URL, no runtime tinting.",
    slug: "solid-image",
    workspace: "@streamline-demo/solid-image",
    port: 4177,
  },
  {
    key: "solid-mask",
    framework: "solid",
    familyLabel: "Solid",
    surface: "jsx",
    renderMode: "mask",
    modeLabel: "Mask",
    navLabel: "Mask",
    title: "Solid / Mask",
    lead: "Real Solid + Vite consumer using `<Icon />` with mask output.",
    summary: "Solid consumer demo with currentColor-driven mask output.",
    emittedElement: "<span>",
    runtimeLabel: "Mask helper runtime, tintable via currentColor.",
    slug: "solid-mask",
    workspace: "@streamline-demo/solid-mask",
    port: 4178,
  },
  {
    key: "solid-svg",
    framework: "solid",
    familyLabel: "Solid",
    surface: "jsx",
    renderMode: "svg",
    modeLabel: "SVG",
    navLabel: "SVG",
    title: "Solid / SVG",
    lead: "Real Solid + Vite consumer using `<Icon />` with inline SVG output.",
    summary: "Solid consumer demo with inline SVG output.",
    emittedElement: "<svg>",
    runtimeLabel: "No asset URL and no helper runtime.",
    slug: "solid-svg",
    workspace: "@streamline-demo/solid-svg",
    port: 4179,
  },
] as const satisfies readonly DemoRoute[]

export const demoRouteByKey = Object.fromEntries(demoRoutes.map((route) => [route.key, route])) as Record<DemoKey, DemoRoute>

export const demoNavSections: DemoNavSection[] = [
  {
    label: "Framework demos",
    groups: [
      { label: "React", keys: ["react-image", "react-mask", "react-svg"] },
      { label: "Solid", keys: ["solid-image", "solid-mask", "solid-svg"] },
    ],
  },
]
