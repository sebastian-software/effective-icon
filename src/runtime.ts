const STREAMLINE_ICON_ELEMENT_NAME = "streamline-icon"

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

export function registerStreamlineIconDefinition(_id: string, _svg: string): void {
  // Kept as a no-op for compatibility with earlier runtime wiring.
}

export function ensureStreamlineIconElement(): void {
  if (typeof customElements === "undefined" || customElements.get(STREAMLINE_ICON_ELEMENT_NAME)) {
    return
  }

  class StreamlineIconElement extends HTMLElement {
    static get observedAttributes(): string[] {
      return ["data-streamline-url"]
    }

    connectedCallback(): void {
      this.render()
    }

    attributeChangedCallback(): void {
      this.render()
    }

    private render(): void {
      const iconUrl = this.getAttribute("data-streamline-url")

      if (!iconUrl) {
        return
      }

      const shadow = this.shadowRoot ?? this.attachShadow({ mode: "open" })
      if (!shadow.innerHTML) {
        shadow.innerHTML = `<style>
  :host {
    display: inline-block;
    inline-size: 1em;
    block-size: 1em;
    vertical-align: middle;
  }

  .glyph {
    display: block;
    inline-size: 100%;
    block-size: 100%;
  }
</style><span class="glyph" part="svg"></span>`
      }

      const root = shadow.querySelector<HTMLSpanElement>(".glyph")
      if (!root) {
        return
      }

      const styles = buildStreamlineMaskStyle(iconUrl, {
        width: "100%",
        height: "100%",
      })

      for (const [key, value] of Object.entries(styles)) {
        root.style.setProperty(toCssPropertyName(key), String(value))
      }

      const label = this.getAttribute("aria-label")
      const hidden = this.getAttribute("aria-hidden")

      if (label) {
        this.setAttribute("role", "img")
        return
      }

      this.setAttribute("role", hidden === "false" ? "img" : "presentation")
    }
  }

  customElements.define(STREAMLINE_ICON_ELEMENT_NAME, StreamlineIconElement)
}

export { STREAMLINE_ICON_ELEMENT_NAME }

function toCssPropertyName(input: string): string {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/^Webkit-/, "-webkit-")
    .replace(/^-ms-/, "-ms-")
    .toLowerCase()
}
