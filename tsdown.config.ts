import { defineConfig } from "tsdown"

export default defineConfig({
  entry: {
    compile: "src/compile.ts",
    index: "src/index.ts",
    runtime: "src/runtime.ts",
  },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  outExtensions: () => ({
    js: ".js",
    dts: ".d.ts",
  }),
  deps: {
    neverBundle: ["typescript", "vite"],
  },
})
