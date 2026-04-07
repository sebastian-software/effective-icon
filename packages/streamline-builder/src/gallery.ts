import type { PackManifest } from "./types"
import {
  PACK_BUGS_URL,
  PACK_HOMEPAGE_URL,
  PACK_MANIFEST_LICENSE,
  PACK_OSS_HOMEPAGE_URL,
  PACK_PACKAGE_LICENSE,
  PACK_REDISTRIBUTOR,
  PACK_REPOSITORY_GIT_URL,
  getPackGalleryUrl,
} from "./release"

export interface PackRenderData {
  iconCount: number
  name: string
  slug: string
  sourceUrl: string
  family: string
  style: string
  version: string
  icons: PackManifest["icons"]
}

interface GroupedCategory {
  category: string
  categorySlug: string
  subcategories: GroupedSubcategory[]
}

interface GroupedSubcategory {
  subcategory: string
  subcategorySlug: string
  icons: PackManifest["icons"]
}

export function createPackPackageJson(pack: PackRenderData) {
  return {
    name: pack.name,
    version: pack.version,
    description: `Redistributed Streamline ${getPackDisplayName(pack)} icon pack`,
    license: PACK_PACKAGE_LICENSE,
    type: "module",
    files: ["manifest.json", "icons", "index.html", "README.md", "ATTRIBUTION.md", "LICENSE"],
    exports: {
      "./manifest.json": "./manifest.json",
      "./icons/*": "./icons/*",
    },
    publishConfig: {
      access: "public",
    },
    repository: {
      type: "git",
      url: PACK_REPOSITORY_GIT_URL,
      directory: `packages/packs/${pack.slug}`,
    },
    homepage: getPackGalleryUrl(pack.slug),
    bugs: {
      url: PACK_BUGS_URL,
    },
    keywords: ["streamline", "icons", "svg", "cc-by-4.0"],
  }
}

export function renderPackReadme(pack: PackRenderData): string {
  return `# ${pack.name}

Redistributed Streamline icon pack for ${getPackDisplayName(pack)}.

- Family: ${pack.family}
- Style: ${pack.style}
- Icons: ${pack.iconCount}
- Source: ${pack.sourceUrl}
- Browse icons: ${getPackGalleryUrl(pack.slug)}
- License: ${PACK_MANIFEST_LICENSE}
- Redistributor: ${PACK_REDISTRIBUTOR}
- OSS Home: ${PACK_OSS_HOMEPAGE_URL}

## Install

\`\`\`bash
npm install ${pack.name}
\`\`\`

## Contents

- \`manifest.json\` for pack metadata and icon lookup
- flat \`icons/*.svg\` files for downstream tooling and asset access
- \`index.html\` for a static icon gallery grouped by category

This package redistributes the publicly available Streamline free icon set and is intended to be consumed by build tools such as \`@effective/icon\`.
`
}

export function renderPackIndexHtml(pack: PackRenderData): string {
  const grouped = groupIcons(pack.icons)
  const categoryNav = grouped
    .map(
      (group) =>
        `<a class="category-nav__link" href="#${escapeAttribute(group.categorySlug)}">${escapeHtml(group.category)}</a>`
    )
    .join("\n")

  const sections = grouped
    .map((group) => {
      const showSubcategoryHeadings =
        group.subcategories.length > 1 ||
        group.subcategories[0]?.subcategorySlug !== group.categorySlug ||
        group.subcategories[0]?.subcategory !== group.category

      const subcategoryMarkup = group.subcategories
        .map((subcategory) => {
          const cards = subcategory.icons
            .map(
              (icon) => `<article class="icon-card">
  <div class="icon-card__preview">
    <img src="./${escapeAttribute(icon.file)}" alt="" loading="lazy" />
  </div>
  <div class="icon-card__meta">
    <span class="icon-card__name">${escapeHtml(icon.originalName)}</span>
  </div>
</article>`
            )
            .join("\n")

          const heading = showSubcategoryHeadings
            ? `<h3 class="subcategory__title" id="${escapeAttribute(subcategory.subcategorySlug)}">${escapeHtml(subcategory.subcategory)}</h3>`
            : ""

          return `<section class="subcategory">
  ${heading}
  <div class="icon-grid">
    ${cards}
  </div>
</section>`
        })
        .join("\n")

      return `<section class="category" id="${escapeAttribute(group.categorySlug)}">
  <header class="category__header">
    <h2 class="category__title">${escapeHtml(group.category)}</h2>
  </header>
  ${subcategoryMarkup}
</section>`
    })
    .join("\n")

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(pack.name)} icon gallery</title>
    <meta
      name="description"
      content="${escapeAttribute(`${pack.name} static icon gallery grouped by category and subcategory.`)}"
    />
    <style>
      :root {
        color-scheme: light;
        --bg: oklch(0.98 0.006 85);
        --paper: oklch(0.995 0.003 85);
        --ink: oklch(0.22 0.025 255);
        --muted: oklch(0.52 0.02 255);
        --line: color-mix(in oklch, var(--ink) 11%, transparent);
        --accent: oklch(0.63 0.17 255);
        --font-sans: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
      }
      * { box-sizing: border-box; }
      html, body { min-height: 100%; }
      body {
        margin: 0;
        color: var(--ink);
        font-family: var(--font-sans);
        background:
          radial-gradient(circle at top left, color-mix(in oklch, var(--accent) 12%, transparent), transparent 24%),
          var(--bg);
      }
      a { color: inherit; }
      main {
        width: min(1240px, calc(100vw - 2rem));
        margin: 0 auto;
        padding: 2rem 0 3rem;
      }
      .hero {
        display: grid;
        gap: 0.9rem;
        margin-bottom: 1.5rem;
      }
      .hero__breadcrumb {
        margin: 0;
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
      }
      .hero__title {
        margin: 0;
        font-size: clamp(2rem, 5vw, 3.5rem);
        line-height: 0.96;
        letter-spacing: -0.05em;
      }
      .hero__lead {
        margin: 0;
        max-width: 56ch;
        font-size: 1rem;
        line-height: 1.65;
        color: var(--muted);
      }
      .meta {
        display: grid;
        gap: 0.9rem;
        padding: 1rem;
        border: 1px solid var(--line);
        border-radius: 1rem;
        background: var(--paper);
        box-shadow: 0 20px 60px color-mix(in oklch, var(--ink) 6%, transparent);
      }
      .meta__grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 0.75rem;
      }
      .meta__item {
        display: grid;
        gap: 0.22rem;
      }
      .meta__label {
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
      }
      .meta__value,
      .meta__value code {
        font-size: 0.96rem;
      }
      .category-nav {
        display: flex;
        flex-wrap: wrap;
        gap: 0.6rem;
        margin: 1.25rem 0 1.8rem;
      }
      .category-nav__link {
        padding: 0.5rem 0.75rem;
        border: 1px solid var(--line);
        border-radius: 999px;
        background: color-mix(in oklch, var(--paper) 72%, white);
        color: var(--muted);
        text-decoration: none;
        font-size: 0.82rem;
        font-weight: 700;
      }
      .category + .category {
        margin-top: 2rem;
      }
      .category__title {
        margin: 0 0 0.9rem;
        font-size: 1.35rem;
        letter-spacing: -0.03em;
      }
      .subcategory + .subcategory {
        margin-top: 1.5rem;
      }
      .subcategory__title {
        margin: 0 0 0.8rem;
        font-size: 0.85rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
      }
      .icon-grid {
        display: grid;
        grid-template-columns: repeat(6, minmax(0, 1fr));
        gap: 0.9rem;
      }
      .icon-card {
        display: grid;
        gap: 0.75rem;
        padding: 0.85rem;
        border: 1px solid var(--line);
        border-radius: 1rem;
        background: var(--paper);
        box-shadow: 0 16px 48px color-mix(in oklch, var(--ink) 5%, transparent);
      }
      .icon-card__preview {
        display: grid;
        place-items: center;
        min-height: 5rem;
        padding: 0.75rem;
        border-radius: 0.8rem;
        background: color-mix(in oklch, var(--accent) 6%, white);
      }
      .icon-card__preview img {
        width: 1.5rem;
        height: 1.5rem;
        color: var(--ink);
      }
      .icon-card__name {
        display: inline-flex;
        max-width: 100%;
        padding: 0.38rem 0.6rem;
        border-radius: 999px;
        background: color-mix(in oklch, var(--accent) 8%, white);
        font-size: 0.78rem;
        font-weight: 700;
        line-height: 1.3;
        overflow-wrap: anywhere;
      }
      @media (max-width: 1160px) {
        .icon-grid {
          grid-template-columns: repeat(5, minmax(0, 1fr));
        }
      }
      @media (max-width: 980px) {
        .meta__grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .icon-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
      }
      @media (max-width: 760px) {
        main {
          width: min(100vw - 1rem, 100%);
          padding-top: 1.3rem;
        }
        .icon-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 480px) {
        .meta__grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <p class="hero__breadcrumb"><a href="${escapeAttribute(PACK_HOMEPAGE_URL)}">@effective/icon packs</a></p>
        <h1 class="hero__title">${escapeHtml(pack.name)}</h1>
        <p class="hero__lead">
          Static overview of the ${escapeHtml(pack.family)} ${escapeHtml(pack.style)} Streamline pack, grouped by
          category for quick browsing.
        </p>
      </section>
      <section class="meta">
        <div class="meta__grid">
          <div class="meta__item">
            <span class="meta__label">Family</span>
            <span class="meta__value">${escapeHtml(pack.family)}</span>
          </div>
          <div class="meta__item">
            <span class="meta__label">Style</span>
            <span class="meta__value">${escapeHtml(pack.style)}</span>
          </div>
          <div class="meta__item">
            <span class="meta__label">Icons</span>
            <span class="meta__value">${Intl.NumberFormat("en-US").format(pack.iconCount)}</span>
          </div>
          <div class="meta__item">
            <span class="meta__label">Install</span>
            <span class="meta__value"><code>npm install ${escapeHtml(pack.name)}</code></span>
          </div>
        </div>
        <div class="meta__item">
          <span class="meta__label">Source</span>
          <span class="meta__value"><a href="${escapeAttribute(pack.sourceUrl)}">${escapeHtml(pack.sourceUrl)}</a></span>
        </div>
      </section>
      <nav class="category-nav" aria-label="Pack categories">
        ${categoryNav}
      </nav>
      ${sections}
    </main>
  </body>
</html>
`
}

function groupIcons(icons: PackManifest["icons"]): GroupedCategory[] {
  const categories = new Map<string, GroupedCategory>()

  for (const icon of icons) {
    let category = categories.get(icon.categorySlug)
    if (!category) {
      category = {
        category: icon.category,
        categorySlug: icon.categorySlug,
        subcategories: [],
      }
      categories.set(icon.categorySlug, category)
    }

    let subcategory = category.subcategories.find((entry) => entry.subcategorySlug === icon.subcategorySlug)
    if (!subcategory) {
      subcategory = {
        subcategory: icon.subcategory,
        subcategorySlug: icon.subcategorySlug,
        icons: [],
      }
      category.subcategories.push(subcategory)
    }

    subcategory.icons.push(icon)
  }

  return [...categories.values()]
}

function capitalize(value: string): string {
  return value.length === 0 ? value : value[0].toUpperCase() + value.slice(1)
}

function getPackDisplayName(pack: Pick<PackRenderData, "family" | "style" | "slug">): string {
  return `${pack.family} ${capitalize(pack.style)}${pack.slug.endsWith("-free") ? " Free" : ""}`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll("'", "&#39;")
}
