import { defineConfig } from "vite"

import { streamlineIcons } from "../../src"

function resolveSource() {
  if (process.env.STREAMLINE_SOURCE_MODE === "api") {
    const baseUrl = process.env.STREAMLINE_FIXTURE_BASE_URL
    if (!baseUrl) {
      throw new Error("Missing STREAMLINE_FIXTURE_BASE_URL for api fixture build")
    }

    return {
      type: "api" as const,
      baseUrl,
      apiKey: process.env.STREAMLINE_FIXTURE_TOKEN ?? "",
      familySlug: "fixture-regular",
      icons: ["rocket", "search"],
      productTier: "free" as const,
    }
  }

  return { type: "free" as const }
}

export default defineConfig({
  plugins: [
    streamlineIcons({
      style: "regular",
      source: resolveSource(),
    }),
  ],
})
