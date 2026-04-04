import path from "node:path"
import { mkdir, rm, writeFile } from "node:fs/promises"
import { spawn } from "node:child_process"

import { demoNavSections, demoRouteByKey, demoRoutes } from "../packages/demo-shared/src/catalog"

const repoRoot = process.cwd()
const outputRoot = path.join(repoRoot, "demo", "dist")

async function main(): Promise<void> {
  await rm(outputRoot, { force: true, recursive: true })

  for (const demo of demoRoutes) {
    await runPnpm(["--filter", demo.workspace, "build"])
  }

  await mkdir(outputRoot, { recursive: true })
  await writeFile(path.join(outputRoot, "index.html"), renderIndexHtml(), "utf8")
}

function renderIndexHtml(): string {
  const accentByMode = {
    image: "oklch(0.62 0.22 28)",
    mask: "oklch(0.56 0.2 250)",
    svg: "oklch(0.55 0.22 295)",
  } as const

  const sections = demoNavSections
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

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>@effective/icon demos</title>
    <meta
      name="description"
      content="Public demo matrix for @effective/icon covering React and Solid integrations across image, mask, and SVG modes."
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
        max-width: 48ch;
        font-size: 1rem;
        line-height: 1.65;
        color: var(--muted);
      }
      .section + .section {
        margin-top: 2rem;
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
      .card__title {
        margin: 0;
        font-size: 1rem;
        letter-spacing: -0.025em;
      }
      .card__desc {
        margin: 0;
        font-size: 0.85rem;
        line-height: 1.55;
        color: var(--muted);
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
        <p class="hero__eyebrow">@effective/icon</p>
        <h1 class="hero__title">Public demos for React and Solid.</h1>
        <p class="hero__lead">
          Compare real React and Solid integrations of @effective/icon across the same image, mask, and SVG modes.
        </p>
      </section>
      ${sections}
    </main>
  </body>
</html>`
}

function runPnpm(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm"
    const child = spawn(command, args, {
      cwd: repoRoot,
      stdio: "inherit",
    })

    child.on("exit", (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`pnpm ${args.join(" ")} exited with code ${code ?? "unknown"}`))
    })

    child.on("error", reject)
  })
}

void main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
