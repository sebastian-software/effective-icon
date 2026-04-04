import { playwright } from "@vitest/browser-playwright"
import { defineConfig } from "vitest/config"
import solid from "vite-plugin-solid"

import { createBrowserProjectConfig, resolveChromiumExecutablePath } from "./test/browser/config"

const browserConfig = createBrowserProjectConfig({
  demo: "solid-mask",
  include: ["test/browser/solid-mask.visual.test.tsx"],
  name: "solid-mask",
})

const executablePath = resolveChromiumExecutablePath()

export default defineConfig({
  ...browserConfig,
  plugins: [...(browserConfig.plugins ?? []), solid()],
  test: {
    ...browserConfig.test,
    browser: {
      ...browserConfig.test?.browser,
      provider: playwright({
        launchOptions: executablePath ? { executablePath } : {},
      }),
      instances: [{ browser: "chromium" }],
    },
  },
})
