const VOID_ELEMENTS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source"])

export const Fragment = Symbol.for("streamline.demo.fragment")

export function h(type: string | symbol, props: Record<string, unknown> | null, ...children: unknown[]): string {
  if (type === Fragment) {
    return flatten(children).join("")
  }

  if (typeof type !== "string") {
    throw new Error(`Unsupported JSX type "${String(type)}" in demo runtime`)
  }

  const attributes = renderAttributes(props ?? {})
  if (VOID_ELEMENTS.has(type)) {
    return `<${type}${attributes}>`
  }

  return `<${type}${attributes}>${flatten(children).join("")}</${type}>`
}

function flatten(values: unknown[]): string[] {
  const flat: string[] = []

  for (const value of values) {
    if (Array.isArray(value)) {
      flat.push(...flatten(value))
      continue
    }

    if (value == null || value === false) {
      continue
    }

    flat.push(String(value))
  }

  return flat
}

function renderAttributes(props: Record<string, unknown>): string {
  return Object.entries(props)
    .filter(([, value]) => value != null && value !== false)
    .map(([name, value]) => {
      const attributeName = name === "className" ? "class" : name
      if (attributeName === "style" && typeof value === "object") {
        const cssText = Object.entries(value as Record<string, unknown>)
          .map(([key, cssValue]) => `${toKebabCase(key)}:${String(cssValue)}`)
          .join(";")
        return ` style="${escapeAttribute(cssText)}"`
      }

      if (value === true) {
        return ` ${attributeName}`
      }

      return ` ${attributeName}="${escapeAttribute(String(value))}"`
    })
    .join("")
}

function toKebabCase(input: string): string {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/^-ms-/, "-ms-")
    .toLowerCase()
}

function escapeAttribute(input: string): string {
  return input.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}
