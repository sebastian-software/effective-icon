# vite-plugin-streamline

Vite plugin for lazy-loading Streamline icons from built-in free assets or a remote `manifest.json`.

## Status

The package now covers the first full end-to-end slice:

- built-in `free` assets for local development and smoke tests
- remote commercial loading through `source: { type: "api" }`
- lazy icon chunks through `virtual:streamline-icons/loader`
- fixture-backed Vite integration coverage for both `free` and `api`

Still intentionally provisional:

- the built-in `free` catalog is a placeholder subset, not the full Streamline Free set
- the sync script is still a normalization helper for local exports, not the primary v1 path
- licensing and redistribution details for shipping a full free catalog still need to be finalized before release

See [docs/current-status.md](/Users/sebastian/Workspace/vite-plugin-streamline/docs/current-status.md), [docs/api-manifest-v1.md](/Users/sebastian/Workspace/vite-plugin-streamline/docs/api-manifest-v1.md), and [docs/adr/0001-separate-vite-plugin-streamline.md](/Users/sebastian/Workspace/vite-plugin-streamline/docs/adr/0001-separate-vite-plugin-streamline.md) for the current contract.

## Install

```bash
pnpm add -D vite-plugin-streamline
```

## Quickstart: Free Assets

```ts
import { defineConfig } from "vite"
import { streamlineIcons } from "vite-plugin-streamline"

export default defineConfig({
  plugins: [
    streamlineIcons({
      style: "regular",
      source: { type: "free" },
    }),
  ],
})
```

Use the generated virtual loader inside your app:

```ts
import { hasIcon, listIcons, loadIcon, selectedStyle } from "virtual:streamline-icons/loader"

const rocket = await loadIcon("rocket")

console.log(selectedStyle)
console.log(listIcons())
console.log(hasIcon("rocket"))
console.log(rocket?.svg)
```

`loadIcon(name)` returns `{ name, style, svg }` or `null`.

## Remote Download: API Source

The first complete commercial path is `source: { type: "api" }`. During the Vite build, the plugin fetches `<baseUrl>/manifest.json`, resolves SVG URLs, and emits lazy icon chunks from the fetched payloads.

```ts
import { defineConfig } from "vite"
import { streamlineIcons } from "vite-plugin-streamline"

export default defineConfig({
  plugins: [
    streamlineIcons({
      style: "regular",
      source: {
        type: "api",
        baseUrl: "https://example.com/streamline",
        headers: {
          Authorization: process.env.STREAMLINE_TOKEN ?? "",
        },
      },
    }),
  ],
})
```

### Canonical `manifest.json`

```json
{
  "icons": {
    "regular": {
      "rocket": "./icons/regular/rocket.svg",
      "search": "./icons/regular/search.svg"
    }
  }
}
```

Rules for v1:

- the manifest must live at `<baseUrl>/manifest.json`
- the top-level shape is exactly `{ "icons": { "<style>": { "<name>": "<url>" } } }`
- supported styles are `light`, `regular`, and `bold`
- icon URLs may be absolute or relative; relative URLs are resolved against the manifest URL
- request headers are forwarded to both the manifest request and each SVG request
- missing manifests, missing requested styles, invalid entries, auth failures, and SVG fetch failures abort the build with explicit errors

The authoritative contract is documented in [docs/api-manifest-v1.md](/Users/sebastian/Workspace/vite-plugin-streamline/docs/api-manifest-v1.md).

## Source Modes

### Free

```ts
streamlineIcons({
  source: { type: "free" },
})
```

### Directory

```ts
streamlineIcons({
  source: { type: "directory", path: "./streamline-pro" },
})
```

### Archive

```ts
streamlineIcons({
  source: { type: "archive", path: "./streamline-pro.zip" },
})
```

### API

```ts
streamlineIcons({
  source: {
    type: "api",
    baseUrl: "https://example.com/streamline",
    headers: { Authorization: process.env.STREAMLINE_TOKEN ?? "" },
  },
})
```

## Runtime Notes

- one global style is selected at plugin setup time
- icons stay lazy because the virtual loader imports each icon through a separate dynamic submodule
- repeated `loadIcon(name)` calls rely on native ESM module caching; the plugin does not add a second cache layer
- the package is framework-agnostic and does not depend on React, Vue, Solid, or Ardo

## Sync Workflow

The sync script still exists for normalizing local exports into the built-in asset layout:

```bash
pnpm sync:streamline --from /path/to/streamline-export
```

By default it writes into `./assets/free/<style>` and normalizes file names into stable icon keys. This is useful for local ingestion, but it is not the primary v1 commercial path.

## Project Layout

```text
src/
  plugin.ts
  manifest.ts
  runtime.ts
  types.ts
  providers/
fixtures/
  api/
  vite-app/
scripts/
  sync-streamline.ts
test/
docs/
```
