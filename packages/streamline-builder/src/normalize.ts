import path from "node:path"

export function normalizePackIconName(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
}

export function createPackIconFileName(input: string): string {
  return `${normalizePackIconName(input)}.svg`
}

export function deriveCategorySlugFromImagePublicId(imagePublicId: string): string {
  const normalized = imagePublicId.replace(/^\/+/, "")
  const segments = normalized.split("/")

  if (segments.length < 2 || segments[0] !== "icons" || !segments[1]) {
    throw new Error(`Unable to derive category slug from imagePublicId "${imagePublicId}"`)
  }

  return segments[1]
}

export function normalizeSubcategorySlug(input: string): string {
  return normalizePackIconName(input)
}

export function normalizeSvgToCurrentColor(svg: string): string {
  const colorTokens = [...svg.matchAll(/var\(--sl-c-[^,]+,\s*(#[0-9a-fA-F]{3,8})\)/g)].map((match) => match[1].toLowerCase())
  const directColors = [...svg.matchAll(/(?:fill|stroke)=\"(#[0-9a-fA-F]{3,8})\"/g)].map((match) => match[1].toLowerCase())
  const colors = new Set([...colorTokens, ...directColors].filter((value) => value !== "#ffffff" && value !== "#fff"))

  if (colors.size !== 1) {
    return svg
  }

  const [onlyColor] = [...colors]
  if (!["#000", "#000000"].includes(onlyColor)) {
    return svg
  }

  return svg
    .replace(/var\(--sl-c-[^,]+,\s*#[0-9a-fA-F]{3,8}\)/g, "currentColor")
    .replace(/(fill|stroke)=\"#[0-9a-fA-F]{3,8}\"/g, `$1="currentColor"`)
}

export function resolvePackDir(rootDir: string, slug: string): string {
  return path.join(rootDir, "packages", "packs", slug)
}
