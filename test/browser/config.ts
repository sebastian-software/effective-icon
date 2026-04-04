import path from "node:path"
import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { createFrameworkDemoConfig } from "../../packages/demo-shared/vite"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..")
const defaultChromeExecutablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

export function createBrowserProjectConfig(options: {
  demo: "react-mask" | "solid-mask"
  include: string[]
  name: string
}) {
  const base = createFrameworkDemoConfig({
    appRoot: repoRoot,
    isDevServer: true,
    outDir: path.join(repoRoot, ".vitest-browser", options.name),
    port: options.demo === "react-mask" ? 4201 : 4202,
    demo: options.demo,
  })

  return {
    ...base,
    test: {
      environment: "node",
      include: options.include,
      browser: createBrowserOptions(),
    },
  }
}

function createBrowserOptions() {
  return {
    enabled: true,
    headless: true,
    screenshotFailures: true,
    viewport: {
      width: 240,
      height: 220,
    },
  }
}

export function resolveChromiumExecutablePath(): string | undefined {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
    return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  }

  if (existsSync(defaultChromeExecutablePath)) {
    return defaultChromeExecutablePath
  }

  return undefined
}
