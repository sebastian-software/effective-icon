import path from "node:path"
import { mkdir, rm, writeFile } from "node:fs/promises"
import { spawn } from "node:child_process"

const repoRoot = process.cwd()
const outputRoot = path.join(repoRoot, "demo", "dist")
const demos = [
  { filter: "@streamline-demo/mask", href: "./mask/", label: "CSS mask output" },
  { filter: "@streamline-demo/image", href: "./image/", label: "External SVG output" },
  { filter: "@streamline-demo/inline-svg", href: "./inline-svg/", label: "SVG output" },
  { filter: "@streamline-demo/web-component", href: "./web-component/", label: "Custom element output" },
  { filter: "@streamline-demo/solid", href: "./solid/", label: "SolidJS consumer demo" },
] as const

async function main(): Promise<void> {
  await rm(outputRoot, { force: true, recursive: true })

  for (const demo of demos) {
    await runPnpm(["--filter", demo.filter, "build"])
  }

  await mkdir(outputRoot, { recursive: true })
  await writeFile(path.join(outputRoot, "index.html"), renderIndexHtml(), "utf8")
}

function renderIndexHtml(): string {
  const iconPaths = {
    airplane:
      'M9.54 4.46c.59.59 1.36 3.39 1.6 4.38a.49.49 0 0 1-.58.58c-1-.24-3.79-1-4.38-1.6A2.14 2.14 0 1 1 9.54 4.46ZM7.47 7.36 1.3 13.5M3.57 9.26l-2.08.67a.52.52 0 0 1-.6-.21L.07 8.45a.49.49 0 0 1 .22-.71l2.19-1M5.91 6.91l1-2.19a.49.49 0 0 1 .71-.22l1.27.82a.52.52 0 0 1 .21.6l-.67 2.08',
    add: 'M7 .5v13M.5 7h13M3.5 3.5l7 7M10.5 3.5l-7 7',
    anchor:
      'M7 .75a3.5 3.5 0 0 0-3.5 3.5c0 2.37 2.63 5.03 3.22 5.6a.38.38 0 0 0 .56 0c.59-.57 3.22-3.23 3.22-5.6A3.5 3.5 0 0 0 7 .75ZM7 5.75a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM2.5 11.25h9M3.5 13.25h7',
  }

  const accentColors: Record<string, string> = {
    image: "oklch(0.62 0.22 28)",
    mask: "oklch(0.56 0.2 250)",
    "inline-svg": "oklch(0.55 0.22 295)",
    "web-component": "oklch(0.58 0.19 155)",
    solid: "oklch(0.54 0.18 228)",
  }

  const descriptions: Record<string, string> = {
    image:
      "Emits <code>&lt;img&gt;</code> elements with external SVG asset URLs. Zero runtime overhead.",
    mask: "Uses <code>mask-image</code> on a <code>&lt;span&gt;</code> for runtime tinting via <code>currentColor</code>.",
    "inline-svg":
      "Inlines the full <code>&lt;svg&gt;</code> markup. Zero runtime, full <code>currentColor</code> support.",
    "web-component":
      "Custom <code>&lt;effective-icon&gt;</code> element with shadow DOM mask. Tintable, framework-agnostic.",
    solid:
      "Real <code>vite-plugin-solid</code> consumer app proving the JSX surface works inside a SolidJS pipeline.",
  }

  function renderIcon(path: string, accent: string): string {
    return `<div class="card__icon"><svg viewBox="0 0 14 14" fill="none" style="color:${accent}"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="${path}"/></svg></div>`
  }

  const cards = demos
    .map((demo) => {
      const key = demo.href.replace(/^\.\/|\/$/g, "")
      const accent = accentColors[key]
      return `<a class="card" href="${demo.href}" style="--card-accent:${accent}">
          <div class="card__icons">${renderIcon(iconPaths.airplane, accent)}${renderIcon(iconPaths.add, accent)}${renderIcon(iconPaths.anchor, accent)}</div>
          <h2 class="card__title">${demo.label}</h2>
          <p class="card__desc">${descriptions[key]}</p>
        </a>`
    })
    .join("\n        ")

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>@effective/icon — compile-time icon resolution</title>
    <meta name="description" content="Resolve package-backed icons at compile time into image, mask, inline SVG, or web component output." />
    <style>
      :root { color-scheme:light; --bg:oklch(0.97 0.008 84); --paper:oklch(0.992 0.005 84); --paper-soft:color-mix(in oklch,var(--paper) 92%,white); --ink:oklch(0.22 0.035 260); --muted:oklch(0.48 0.03 260); --line:color-mix(in oklch,var(--ink) 10%,transparent); --font-sans:ui-sans-serif,system-ui,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji"; }
      * { box-sizing:border-box; }
      html { min-height:100%; background:var(--bg); }
      body { margin:0; color:var(--ink); font-family:var(--font-sans); -webkit-font-smoothing:antialiased; }
      a { color:inherit; }
      .topbar { position:sticky; top:0; z-index:100; background:color-mix(in oklch,var(--bg) 80%,transparent); backdrop-filter:blur(16px) saturate(1.4); -webkit-backdrop-filter:blur(16px) saturate(1.4); border-bottom:1px solid var(--line); }
      .topbar__inner { display:flex; align-items:center; width:min(1080px,calc(100vw - 2rem)); height:3rem; margin:0 auto; }
      .topbar__name { font-size:0.8125rem; font-weight:700; letter-spacing:-0.01em; color:var(--muted); }
      main { width:min(1080px,calc(100vw - 2rem)); margin:0 auto; padding:2.5rem 0 3rem; }
      h1 { margin:0; font-size:clamp(1.75rem,4.5vw,2.75rem); font-weight:800; line-height:1; letter-spacing:-0.04em; max-width:22ch; }
      .tagline { margin:0.5rem 0 0; font-size:0.9375rem; line-height:1.55; color:var(--muted); max-width:48ch; }
      .card-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:0.75rem; margin-top:2rem; }
      .card { display:grid; gap:0.75rem; padding:1.25rem; border:1px solid var(--line); border-radius:0.75rem; background:var(--paper); text-decoration:none; position:relative; overflow:hidden; transition:border-color 100ms ease,box-shadow 100ms ease; }
      .card::before { content:""; position:absolute; inset:0; background:radial-gradient(circle at 50% 0%,color-mix(in oklch,var(--card-accent) 10%,transparent),transparent 65%); pointer-events:none; }
      @media (hover:hover) and (pointer:fine) { .card:hover { border-color:color-mix(in oklch,var(--ink) 20%,transparent); box-shadow:0 2px 8px color-mix(in oklch,var(--ink) 5%,transparent); } }
      .card:focus-visible { outline:2px solid var(--ink); outline-offset:2px; }
      .card__icons { display:flex; gap:0.5rem; }
      .card__icon { display:grid; place-items:center; width:2.25rem; height:2.25rem; border-radius:0.375rem; background:color-mix(in oklch,var(--paper) 84%,white); box-shadow:inset 0 0 0 1px var(--line); }
      .card__icon svg { width:1.125rem; height:1.125rem; }
      .card__title { margin:0; font-size:0.9375rem; font-weight:700; letter-spacing:-0.02em; }
      .card__desc { margin:0; font-size:0.8125rem; line-height:1.55; color:var(--muted); }
      .card__desc code { font-size:0.75rem; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; }
      .page-footer { display:flex; flex-wrap:wrap; gap:0.25rem 1rem; padding:1rem 0 0; border-top:1px solid var(--line); margin-top:2rem; font-size:0.75rem; color:color-mix(in oklch,var(--muted) 70%,transparent); }
      @media (prefers-reduced-motion:reduce) { *,*::before,*::after { transition:none !important; } }
      @media (max-width:720px) { main { width:min(100vw - 1rem,100%); } .topbar__inner { width:min(100vw - 1rem,100%); } .card-grid { grid-template-columns:1fr; } .page-footer { flex-direction:column; } }
    </style>
  </head>
  <body>
    <header class="topbar"><div class="topbar__inner"><span class="topbar__name">@effective/icon</span></div></header>
    <main>
      <h1>Streamline icons, resolved at compile time.</h1>
      <p class="tagline">Write once, compile to any output format. The output demos below are separate build targets, and the SolidJS card proves the JSX surface in a real framework app.</p>
      <div class="card-grid">
        ${cards}
      </div>
      <footer class="page-footer">
        <span>@effective/icon</span>
        <span>Each variant is its own pnpm workspace build</span>
      </footer>
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
