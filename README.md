# iconkit

Compile-time icon toolkit with package-backed icon resolution.

Instead of importing icons manually or using a runtime registry, the plugin rewrites marker-based icon usage to static asset imports during the build.

## Status

The current V1 direction is a compile-time reset:

- one selected icon package per project
- marker-based authoring via `iconkit/compile`
- static validation against the selected package manifest
- build-time rewrites for:
  - JSX image output
  - JSX mask output
  - JSX inline SVG output
  - generic web-component output

The repo also contains the Streamline pack builder workspace that produces pack packages with:

- `manifest.json`
- `icons/*.svg`
- package exports for both

## Install

```bash
pnpm add -D iconkit
```

Add or install at least one compatible icon pack, for example:

```bash
pnpm add -D @icon-pkg/streamline-core-line-free
```

## Authoring

Import the compile-time markers:

```tsx
import { Icon, icon } from "iconkit/compile"
```

Then use either surface:

```tsx
<Icon name="airplane" className="size-4" />
```

```tsx
{icon`add-1`}
```

## Vite Config

### JSX Image Output

```ts
import { defineConfig } from "vite"
import { iconkitVitePlugin } from "iconkit/vite-plugin"

export default defineConfig({
  plugins: [
    iconkitVitePlugin({
      package: "@icon-pkg/streamline-core-line-free",
      target: "jsx",
      renderMode: "image",
    }),
  ],
})
```

This rewrites icons to static image-style JSX output backed by URL imports.

### JSX Mask Output

```ts
iconkitVitePlugin({
  package: "@icon-pkg/streamline-core-line-free",
  target: "jsx",
  renderMode: "mask",
})
```

This rewrites icons to static JSX output with mask-image styling.

### JSX Inline SVG Output

```ts
iconkitVitePlugin({
  package: "@icon-pkg/streamline-core-line-free",
  target: "jsx",
  renderMode: "inline-svg",
})
```

This rewrites icons to inline `<svg>` markup in the emitted JSX.

### Web Component Output

```ts
iconkitVitePlugin({
  package: "@icon-pkg/streamline-core-line-free",
  target: "web-component",
})
```

This rewrites icons to a generic `<iconkit-icon>` custom element, keeps the icons as external SVG asset URLs, and renders them as tintable mask-based glyphs in shadow DOM.

## Rules

- `package` must be an explicit package name
- `name` must be a static string literal
- template-tag usage must not contain interpolation
- spread props are rejected
- children are rejected
- unknown icon names fail the build
- marker imports are required

## Icon Pack Contract

Compatible icon packages are expected to ship:

- `manifest.json`
- `icons/*.svg`
- `exports["./manifest.json"]`
- `exports["./icons/*"]`

The plugin reads the manifest during build setup and resolves icon file paths from it.

## Demo

```bash
pnpm build:demo
pnpm dev:demo
```

The demo is structured as four real pnpm workspace apps that share most of their content/UI:

- `pnpm dev:demo` starts all four dev servers together
- `pnpm dev:demo:image` for `jsx/image`
- `pnpm dev:demo:mask` for `jsx/mask`
- `pnpm dev:demo:inline-svg` for `jsx/inline-svg`
- `pnpm dev:demo:web-component` for `web-component`

Default local ports:

- `http://127.0.0.1:4174/` for `jsx/image`
- `http://127.0.0.1:4175/` for `jsx/mask`
- `http://127.0.0.1:4176/` for `jsx/inline-svg`
- `http://127.0.0.1:4177/` for `web-component`

`pnpm build:demo` builds the four apps plus a small landing index into `demo/dist` against the sample workspace pack in `packages/packs/core-line-free`.

## Builder Workspace

The builder workspace lives under `packages/streamline-builder` and is responsible for producing downstream icon pack packages.

For builder commands, define your API key in the workspace root via `.env.local`, `.env`, or normal shell environment variables:

```bash
STREAMLINE_API_KEY=...
STREAMLINE_API_BASE_URL=https://public-api.streamlinehq.com
```

Available commands:

```bash
pnpm download:set -- core-line-free
pnpm download:free
pnpm validate:packs
pnpm release:packs:check
pnpm release:packs:publish
```

The live downloader is still under active development for full Streamline pagination, but the emitted package contract is already aligned with the compile-time plugin.

## Publishing the Initial Pack Set

The first npm release is intentionally scoped to the three materialized pack workspaces already tracked in this repository:

- `@icon-pkg/streamline-core-line-free`
- `@icon-pkg/streamline-core-solid-free`
- `@icon-pkg/streamline-core-remix-free`

Use the dedicated release check before publishing:

```bash
pnpm release:packs:check
```

Then publish them manually in order with:

```bash
pnpm release:packs:publish
```

See [docs/npm-pack-publish.md](docs/npm-pack-publish.md) for the full manual release runbook.

The current builder strategy for free packs is hybrid:

- official API endpoints are used for discovery and metadata
- public SVG URLs are preferred over the API SVG download endpoint
- website page-state is kept only as a fallback when required metadata or SVG content is missing
