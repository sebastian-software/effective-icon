const STREAMLINE_ICON_ELEMENT_NAME = "streamline-icon"

const iconDefinitions = new Map<string, string>()

export type StreamlineStyleValue = Record<string, unknown> | undefined

export function buildStreamlineMaskStyle(iconUrl: string, style?: StreamlineStyleValue): Record<string, unknown> {
  const baseStyle: Record<string, unknown> = {
    display: "inline-block",
    backgroundColor: "currentColor",
    WebkitMaskImage: `url("${iconUrl}")`,
    maskImage: `url("${iconUrl}")`,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
    WebkitMaskSize: "contain",
    maskSize: "contain",
    width: "1em",
    height: "1em",
    verticalAlign: "middle",
  }

  if (!style || typeof style !== "object") {
    return baseStyle
  }

  return {
    ...baseStyle,
    ...style,
  }
}

export function registerStreamlineIconDefinition(id: string, svg: string): void {
  if (!iconDefinitions.has(id)) {
    iconDefinitions.set(id, svg)
  }
}

export function ensureStreamlineIconElement(): void {
  if (typeof customElements === "undefined" || customElements.get(STREAMLINE_ICON_ELEMENT_NAME)) {
    return
  }

  class StreamlineIconElement extends HTMLElement {
    static get observedAttributes(): string[] {
      return ["data-streamline-id", "aria-label", "aria-hidden"]
    }

    connectedCallback(): void {
      this.render()
    }

    attributeChangedCallback(): void {
      this.render()
    }

    private render(): void {
      const id = this.getAttribute("data-streamline-id")
      const svg = id ? iconDefinitions.get(id) : null

      if (!svg) {
        return
      }

      const shadow = this.shadowRoot ?? this.attachShadow({ mode: "open" })
      shadow.innerHTML = svg

      const root = shadow.firstElementChild
      if (!(root instanceof SVGElement)) {
        return
      }

      root.setAttribute("part", "svg")
      root.setAttribute("focusable", "false")
      root.setAttribute("width", "1em")
      root.setAttribute("height", "1em")

      const label = this.getAttribute("aria-label")
      const hidden = this.getAttribute("aria-hidden")

      if (label) {
        root.setAttribute("role", "img")
        root.setAttribute("aria-label", label)
        root.setAttribute("aria-hidden", "false")
        return
      }

      root.setAttribute("aria-hidden", hidden ?? "true")
      root.setAttribute("role", hidden === "false" ? "img" : "presentation")
    }
  }

  customElements.define(STREAMLINE_ICON_ELEMENT_NAME, StreamlineIconElement)
}

export { STREAMLINE_ICON_ELEMENT_NAME }
