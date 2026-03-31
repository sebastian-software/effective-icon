# vite-plugin-streamline

Vite plugin for lazy-loading Streamline icons from built-in free assets, local exports, or the official Streamline API.

## Status

The package now covers the first full end-to-end slice:

- built-in `free` assets for local development and smoke tests
- remote loading through the official Streamline API search/download flow
- lazy icon chunks through `virtual:streamline-icons/loader`
- fixture-backed Vite integration coverage for both `free` and `api`

Still intentionally provisional:

- the built-in `free` catalog is a placeholder subset, not the full Streamline Free set
- the sync script is still a normalization helper for local exports, not the primary v1 path
- licensing and redistribution details for shipping a full free catalog still need to be finalized before release

See [docs/current-status.md](/Users/sebastian/Workspace/vite-plugin-streamline/docs/current-status.md), [docs/streamline-api-v1.md](/Users/sebastian/Workspace/vite-plugin-streamline/docs/streamline-api-v1.md), and [docs/adr/0001-separate-vite-plugin-streamline.md](/Users/sebastian/Workspace/vite-plugin-streamline/docs/adr/0001-separate-vite-plugin-streamline.md) for the current contract.

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

## Remote Download: Official Streamline API

The primary remote path now follows Streamline's official API:

- `GET /v1/search/global?query=<icon-name>`
- `GET /v1/icons/{hash}/download/svg`
- `Authorization: Bearer <apiKey>`

The plugin performs the search step at build time for each requested icon, resolves an exact name match, then downloads the SVG payload for the selected hash.

```ts
import { defineConfig } from "vite"
import { streamlineIcons } from "vite-plugin-streamline"

export default defineConfig({
  plugins: [
    streamlineIcons({
      style: "light",
      source: {
        type: "api",
        apiKey: process.env.STREAMLINE_API_KEY ?? "",
        familySlug: "ultimate-light-free",
        icons: ["rocket", "search"],
      },
    }),
  ],
})
```

### API Source Rules

- `apiKey` is required and is sent as `Authorization: Bearer <apiKey>`
- `icons` is required and lists the icon names you want available through the virtual loader
- `familySlug` is recommended and becomes effectively required whenever the search API returns multiple exact matches across families
- `baseUrl` is optional and defaults to `https://public-api.streamlinehq.com`
- the plugin searches each icon name independently and requires an exact normalized name match
- missing results, ambiguous exact matches, auth failures, search failures, and SVG download failures abort the build with explicit errors

The authoritative contract is documented in [docs/streamline-api-v1.md](/Users/sebastian/Workspace/vite-plugin-streamline/docs/streamline-api-v1.md).

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
  style: "light",
  source: {
    type: "api",
    apiKey: process.env.STREAMLINE_API_KEY ?? "",
    familySlug: "ultimate-light-free",
    icons: ["rocket", "search"],
  },
})
```

## Runtime Notes

- one global style is selected at plugin setup time
- icons stay lazy because the virtual loader imports each icon through a separate dynamic submodule
- repeated `loadIcon(name)` calls rely on native ESM module caching; the plugin does not add a second cache layer
- the package is framework-agnostic and does not depend on React, Vue, Solid, or Ardo
- the `api` source does not infer style from Streamline's API; your chosen plugin `style` is metadata for the returned payload, while the actual API disambiguation happens through `familySlug`

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
