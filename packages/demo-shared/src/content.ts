import { demoRouteByKey, type DemoFramework, type DemoKey, type DemoRenderMode, type DemoRoute } from "./catalog"

interface DemoPackInfo {
  family: string
  iconCount: number
  license: string
  packageName: string
  sourceUrl: string
  style: string
  version: string
}

type DemoLinkMap = Record<DemoKey, string>

interface DemoFact {
  label: string
  value: string
}

export interface DemoPageDefinition {
  facts: DemoFact[]
  outputCode: string
  outputLabel: string
  proofLabel: string
  route: DemoRoute
  sourceCode: string
  sourceLabel: string
}

declare const __STREAMLINE_DEMO_PACK_INFO__: DemoPackInfo
declare const __STREAMLINE_DEMO_LINKS__: DemoLinkMap

export const packInfo = __STREAMLINE_DEMO_PACK_INFO__
export const demoLinks = __STREAMLINE_DEMO_LINKS__

export function getDemoPageDefinition(key: DemoKey): DemoPageDefinition {
  const route = demoRouteByKey[key]

  return {
    route,
    proofLabel: `${route.familyLabel} demo`,
    sourceLabel: `${route.familyLabel} source`,
    sourceCode: getFrameworkSource(route.framework, route.renderMode),
    outputLabel: `Output — ${route.modeLabel}`,
    outputCode: getOutputCode(route.framework, route.renderMode),
    facts: buildFacts(route),
  }
}

export function getProofSyntax(): string {
  return `<Icon name="airplane" />`
}

function buildFacts(route: DemoRoute): DemoFact[] {
  return [
    { label: "Demo", value: "Framework integration" },
    { label: "Consumer", value: route.familyLabel },
    { label: "Authoring API", value: "`<Icon />`" },
    { label: "Render mode", value: route.modeLabel },
    { label: "Emitted element", value: route.emittedElement },
    { label: "Runtime", value: route.runtimeLabel },
  ]
}

function getFrameworkSource(framework: DemoFramework, renderMode: DemoRenderMode): string {
  if (framework === "solid") {
    return `import { Icon } from "@effective/icon/compile"

export function StatusCard() {
  return <Icon name="airplane" class="status-icon" aria-label="Airplane" />
}

// Vite plugin config uses renderMode: "${renderMode}".`
  }

  return `import { Icon } from "@effective/icon/compile"

export function StatusCard() {
  return <Icon name="airplane" className="status-icon" aria-label="Airplane" />
}

// Vite plugin config uses renderMode: "${renderMode}".`
}

function getOutputCode(framework: DemoFramework, renderMode: DemoRenderMode): string {
  if (renderMode === "mask") {
    if (framework === "solid") {
      return `import "virtual:effective-icon/mask.css"
import __iconAsset0 from ".../airplane.svg?url"

function StatusDemo() {
  return <span class="status-icon effective-icon-mask" style={\`--effective-icon-mask-image:url("\${__iconAsset0}");\`} aria-label="Airplane" />
}`
    }

    return `import "virtual:effective-icon/mask.css"
import __iconAsset0 from ".../airplane.svg?url"

function StatusDemo() {
  return <span className="status-icon" style={{
    "--effective-icon-mask-image": \`url("\${__iconAsset0}")\`,
  }} className="status-icon effective-icon-mask" aria-label="Airplane" />
}`
  }

  if (renderMode === "svg") {
    return `function StatusDemo() {
  return (
    <svg className="status-icon" viewBox="0 0 14 14" fill="none" aria-label="Airplane">
      <path stroke="currentColor" d="M9.54 4.46..." />
    </svg>
  )
}`
  }

  return `import __iconAsset0 from ".../airplane.svg?url"

function StatusDemo() {
  return <img className="status-icon" src={__iconAsset0} alt="" aria-label="Airplane" />
}`
}
