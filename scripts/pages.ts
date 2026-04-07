import { cp, mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import { demoNavSections, demoRouteByKey } from "../packages/demo-shared/src/catalog"
import { PACK_HOMEPAGE_URL, RELEASE_PACK_SLUGS } from "../packages/streamline-builder/src/release"
import type { PackManifest } from "../packages/streamline-builder/src/types"

export interface ReleasePackSummary {
  family: string
  familyDescription?: string
  gridSize?: number
  gridLabel?: string
  href: string
  iconCount: number
  packageName: string
  slug: string
  style: string
  summary: string
}

export async function loadReleasePackSummaries(repoRoot: string): Promise<ReleasePackSummary[]> {
  return Promise.all(
    RELEASE_PACK_SLUGS.map(async (slug) => {
      const manifest = JSON.parse(
        await readFile(path.join(repoRoot, "packages", "packs", slug, "manifest.json"), "utf8")
      ) as PackManifest

      return {
        family: manifest.family,
        familyDescription: manifest.familyDescription,
        gridSize: manifest.gridSize,
        gridLabel: manifest.gridLabel,
        href: `./packs/${slug}/`,
        iconCount: manifest.iconCount,
        packageName: manifest.name,
        slug,
        style: manifest.style,
        summary: getPackStyleSummary(manifest.style, manifest.familyDescription),
      }
    })
  )
}

export async function copyReleasePackArtifacts(repoRoot: string, outputRoot: string): Promise<void> {
  const pagesPackRoot = path.join(outputRoot, "packs")
  await mkdir(pagesPackRoot, { recursive: true })

  await Promise.all(
    RELEASE_PACK_SLUGS.map(async (slug) => {
      const sourceDir = path.join(repoRoot, "packages", "packs", slug)
      const targetDir = path.join(pagesPackRoot, slug)
      await cp(sourceDir, targetDir, { recursive: true })
    })
  )
}

export async function writePagesIndex(repoRoot: string, outputRoot: string): Promise<void> {
  const packSummaries = await loadReleasePackSummaries(repoRoot)
  await writeFile(path.join(outputRoot, "index.html"), renderPagesIndexHtml(packSummaries), "utf8")
}

export function renderPagesIndexHtml(packSummaries: ReleasePackSummary[]): string {
  const accentByMode = {
    image: "oklch(0.62 0.22 28)",
    mask: "oklch(0.56 0.2 250)",
    svg: "oklch(0.55 0.22 295)",
  } as const

  const demoSections = demoNavSections
    .map((section) => {
      const groups = section.groups
        .map((group) => {
          const cards = group.keys
            .map((key) => {
              const route = demoRouteByKey[key]
              const accent = accentByMode[route.renderMode]
              return `<a class="card" href="./${route.slug}/" style="--card-accent:${accent}">
  <span class="card__pill">${route.modeLabel}</span>
  <h3 class="card__title">${route.title}</h3>
  <p class="card__desc">${route.summary}</p>
</a>`
            })
            .join("\n")

          return `<section class="group">
  <header class="group__header">
    <h3 class="group__title">${group.label}</h3>
  </header>
  <div class="card-grid">
    ${cards}
  </div>
</section>`
        })
        .join("\n")

      return `<section class="section">
  <header class="section__header">
    <h2 class="section__title">${section.label}</h2>
  </header>
  <div class="section__groups">
    ${groups}
  </div>
</section>`
    })
    .join("\n")

  const packCards = packSummaries
    .map(
      (pack) => `<a class="card card--pack" href="${pack.href}" style="--card-accent:oklch(0.63 0.17 255)">
  <div class="card__head">
    <span class="card__pill">${escapeHtml(pack.family)} / ${escapeHtml(formatStyleLabel(pack.style))}</span>
    <span class="card__stats">${Intl.NumberFormat("en-US").format(pack.iconCount)} icons${pack.gridLabel ? ` · ${escapeHtml(pack.gridLabel)}` : pack.gridSize ? ` · ${pack.gridSize} px grid` : ""}</span>
  </div>
  <h3 class="card__title">${escapeHtml(pack.packageName)}</h3>
  <p class="card__desc">${escapeHtml(pack.summary)}</p>
</a>`
    )
    .join("\n")

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>@effective/icon demos and packs</title>
    <meta
      name="description"
      content="Public site for @effective/icon with framework demos and static icon pack galleries."
    />
    <style>
      :root {
        color-scheme: light;
        --bg: oklch(0.98 0.005 84);
        --paper: oklch(0.995 0.003 84);
        --ink: oklch(0.21 0.025 260);
        --muted: oklch(0.5 0.02 260);
        --line: color-mix(in oklch, var(--ink) 10%, transparent);
        --font-sans: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
      }
      * { box-sizing: border-box; }
      html,
      body { min-height: 100%; }
      body {
        margin: 0;
        color: var(--ink);
        font-family: var(--font-sans);
        background:
          radial-gradient(circle at top left, color-mix(in oklch, oklch(0.62 0.22 28) 10%, transparent), transparent 22%),
          radial-gradient(circle at top right, color-mix(in oklch, oklch(0.63 0.17 255) 10%, transparent), transparent 18%),
          var(--bg);
      }
      a { color: inherit; }
      main {
        width: min(1180px, calc(100vw - 2rem));
        margin: 0 auto;
        padding: 2.5rem 0 3rem;
      }
      .hero {
        display: grid;
        gap: 0.75rem;
        margin-bottom: 2rem;
      }
      .hero__eyebrow {
        margin: 0;
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
      }
      .hero__title {
        margin: 0;
        font-size: clamp(2rem, 5vw, 3.4rem);
        line-height: 0.95;
        letter-spacing: -0.045em;
      }
      .hero__lead {
        margin: 0;
        max-width: 52ch;
        font-size: 1rem;
        line-height: 1.65;
        color: var(--muted);
      }
      .section + .section {
        margin-top: 2.2rem;
      }
      .section__title {
        margin: 0;
        font-size: 1.15rem;
        letter-spacing: -0.03em;
      }
      .section__groups {
        display: grid;
        gap: 1.25rem;
        margin-top: 0.9rem;
      }
      .group__title {
        margin: 0 0 0.75rem;
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
      }
      .card-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.875rem;
      }
      .card {
        display: grid;
        gap: 0.55rem;
        padding: 1rem;
        border: 1px solid var(--line);
        border-radius: 1rem;
        background: var(--paper);
        text-decoration: none;
        box-shadow: 0 20px 60px color-mix(in oklch, var(--ink) 6%, transparent);
      }
      .card__head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
      }
      .card__pill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: fit-content;
        min-width: 3.2rem;
        height: 1.7rem;
        padding: 0 0.7rem;
        border-radius: 999px;
        background: color-mix(in oklch, var(--card-accent) 14%, white);
        color: color-mix(in oklch, var(--ink) 74%, var(--card-accent));
        font-size: 0.72rem;
        font-weight: 700;
      }
      .card__stats {
        flex: 0 0 auto;
        font-size: 0.74rem;
        font-weight: 700;
        color: var(--muted);
        text-align: right;
        white-space: nowrap;
      }
      .card__title {
        margin: 0;
        font-size: 1rem;
        letter-spacing: -0.025em;
      }
      .card__desc {
        margin: 0;
        font-size: 0.85rem;
        line-height: 1.5;
        color: var(--muted);
      }
      .section__intro {
        margin: 0.35rem 0 0;
        max-width: 58ch;
        color: var(--muted);
        line-height: 1.6;
      }
      @media (hover:hover) and (pointer:fine) {
        .card:hover {
          border-color: color-mix(in oklch, var(--card-accent) 28%, transparent);
        }
      }
      @media (max-width: 860px) {
        .card-grid {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 720px) {
        main {
          width: min(100vw - 1rem, 100%);
          padding-top: 1.5rem;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <p class="hero__eyebrow"><a href="${PACK_HOMEPAGE_URL}">@effective/icon</a></p>
        <h1 class="hero__title">Framework demos and static icon pack galleries.</h1>
        <p class="hero__lead">
          Compare real React and Solid integrations of @effective/icon, then browse the currently published Streamline
          packs by category on the same public site.
        </p>
      </section>
      ${demoSections}
      <section class="section">
        <header class="section__header">
          <h2 class="section__title">Icon packs</h2>
          <p class="section__intro">
            Published Streamline packs ship with a static category index so the package README can link to a browsable
            overview instead of a raw manifest.
          </p>
        </header>
        <div class="section__groups">
          <section class="group">
            <div class="card-grid">
              ${packCards}
            </div>
          </section>
        </div>
      </section>
    </main>
  </body>
</html>`
}

function capitalize(value: string): string {
  return value.length === 0 ? value : value[0].toUpperCase() + value.slice(1)
}

function formatStyleLabel(value: string): string {
  return value
    .split("-")
    .filter(Boolean)
    .map((segment) => capitalize(segment))
    .join(" ")
}

function getPackStyleSummary(style: string, familyDescription?: string): string {
  const normalized = style.toLowerCase()

  if (normalized === "line") {
    return "Clean line icons with consistent stroke weight."
  }

  if (normalized === "solid") {
    return "Filled icons tuned for faster visual recognition."
  }

  if (normalized === "remix") {
    return "Hybrid line-and-solid styling with extra energy."
  }

  return familyDescription ? shortenSentence(familyDescription) : `${capitalize(style)} icons for general interface work.`
}

function shortenSentence(input: string): string {
  const trimmed = input.trim()
  const sentence = trimmed.match(/^[^.?!]+[.?!]?/)
  return sentence?.[0]?.trim() || trimmed
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
