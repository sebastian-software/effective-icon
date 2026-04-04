import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts", "packages/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      reporter: ["text", "json-summary", "lcov"],
      thresholds: {
        lines: 90,
      },
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: [
        "src/index.ts",
        "src/types.ts",
        "src/compile.ts",
        "src/**/*.d.ts",
        "test/**",
        "test/browser/**",
        "packages/**",
        "scripts/**",
        "fixtures/**",
        "demo/**",
        "dist/**",
        "**/*.config.*",
      ],
    },
  },
})
