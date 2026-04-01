const EFFECTIVE_ICON_ELEMENT_NAME = "effective-icon"

export type IconStyleValue = Record<string, unknown> | undefined

export function buildIconMaskStyle(iconUrl: string, style?: IconStyleValue): Record<string, unknown> {
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

export function registerIconDefinition(_id: string, _svg: string): void {
  // Kept as a no-op for compatibility with earlier runtime wiring.
}

export function ensureIconElement(): void {
  if (typeof customElements === "undefined" || customElements.get(EFFECTIVE_ICON_ELEMENT_NAME)) {
    return
  }

  class EffectiveIconElement extends HTMLElement {
    static get observedAttributes(): string[] {
      return ["data-icon-url"]
    }

    connectedCallback(): void {
      this.render()
    }

    attributeChangedCallback(): void {
      this.render()
    }

    private render(): void {
      const iconUrl = this.getAttribute("data-icon-url")

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

      const styles = buildIconMaskStyle(iconUrl, {
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

  customElements.define(EFFECTIVE_ICON_ELEMENT_NAME, EffectiveIconElement)
}

export { EFFECTIVE_ICON_ELEMENT_NAME }

function toCssPropertyName(input: string): string {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/^Webkit-/, "-webkit-")
    .replace(/^-ms-/, "-ms-")
    .toLowerCase()
}
