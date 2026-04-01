import path from "node:path"
import { mkdir, rm, writeFile } from "node:fs/promises"
import { spawn } from "node:child_process"

const repoRoot = process.cwd()
const outputRoot = path.join(repoRoot, "demo", "dist")
const demos = [
  { filter: "@streamline-demo/image", href: "./image/", label: "JSX image output" },
  { filter: "@streamline-demo/mask", href: "./mask/", label: "JSX mask output" },
  { filter: "@streamline-demo/inline-svg", href: "./inline-svg/", label: "JSX inline SVG output" },
  { filter: "@streamline-demo/web-component", href: "./web-component/", label: "Web component output" },
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
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>vite-plugin-streamline demo apps</title>
    <meta name="description" content="Workspace demos for vite-plugin-streamline output variants." />
    <style>
      :root {
        color-scheme: light;
        --bg: oklch(0.975 0.01 84);
        --paper: oklch(0.992 0.006 84);
        --ink: oklch(0.238 0.035 248);
        --muted: oklch(0.49 0.036 248);
        --line: color-mix(in oklch, var(--ink) 12%, transparent);
      }
      * { box-sizing: border-box; }
      html { min-height: 100%; background: linear-gradient(180deg, var(--bg), color-mix(in oklch, var(--bg) 88%, white)); }
      body {
        margin: 0;
        color: var(--ink);
        font-family: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
      }
      main { width: min(900px, calc(100vw - 2rem)); margin: 0 auto; padding: 2rem 0 4rem; }
      h1 { margin: 0; font-size: clamp(2.8rem, 8vw, 5rem); font-weight: 800; line-height: 0.92; letter-spacing: -0.05em; max-width: 10ch; }
      p { line-height: 1.65; color: color-mix(in oklch, var(--ink) 78%, var(--paper)); }
      .list { display: grid; gap: 1rem; margin-top: 1.5rem; }
      .row { display: grid; gap: 0.45rem; padding: 1rem 0; border-top: 1px solid var(--line); }
      .row a { font-weight: 700; color: inherit; text-decoration: none; }
      .eyebrow { margin: 0 0 0.7rem; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); }
    </style>
  </head>
  <body>
    <main>
      <p class="eyebrow">vite-plugin-streamline demos</p>
      <h1>Four real workspace apps.</h1>
      <p>Each variant is its own pnpm workspace project, built and tested independently while sharing the same authored source structure and visual system.</p>
      <div class="list">
        ${demos
          .map(
            (demo) => `<div class="row"><a href="${demo.href}">${demo.label}</a><p>Open the standalone demo app for this compile target.</p></div>`
          )
          .join("")}
      </div>
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
