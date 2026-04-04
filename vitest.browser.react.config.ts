import react from "@vitejs/plugin-react"
import { playwright } from "@vitest/browser-playwright"
import { defineConfig } from "vitest/config"

import { createBrowserProjectConfig, resolveChromiumExecutablePath } from "./test/browser/config"

const browserConfig = createBrowserProjectConfig({
  demo: "react-mask",
  include: ["test/browser/react-mask.visual.test.tsx"],
  name: "react-mask",
})

const executablePath = resolveChromiumExecutablePath()

export default defineConfig({
  ...browserConfig,
  plugins: [...(browserConfig.plugins ?? []), react()],
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
