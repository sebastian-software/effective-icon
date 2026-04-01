# vite-plugin-streamline

Vite plugin for compile-time Streamline icon resolution.

Instead of importing icons manually or using a runtime registry, the plugin rewrites marker-based icon usage to static asset imports during the build.

## Status

The current V1 direction is a compile-time reset:

- one selected icon package per project
- marker-based authoring via `vite-plugin-streamline/compile`
- static validation against the selected package manifest
- build-time rewrites for:
  - JSX image output
  - JSX mask output
  - generic web-component output

The repo also contains the Streamline pack builder workspace that produces pack packages with:

- `manifest.json`
- `icons/*.svg`
- package exports for both

## Install

```bash
pnpm add -D vite-plugin-streamline
```

Add or install at least one compatible icon pack, for example:

```bash
pnpm add -D @streamline-pkg/core-line-free
```

## Authoring

Import the compile-time markers:

```tsx
import { Icon, icon } from "vite-plugin-streamline/compile"
```

Then use either surface:

```tsx
<Icon name="rocket" className="size-4" />
```

```tsx
{icon`search`}
```

## Vite Config

### JSX Image Output

```ts
import { defineConfig } from "vite"
import { streamlineIcons } from "vite-plugin-streamline"

export default defineConfig({
  plugins: [
    streamlineIcons({
      package: "@streamline-pkg/core-line-free",
      target: "jsx",
      renderMode: "component",
    }),
  ],
})
```

This rewrites icons to static image-style JSX output backed by URL imports.

### JSX Mask Output

```ts
streamlineIcons({
  package: "@streamline-pkg/core-line-free",
  target: "jsx",
  renderMode: "mask",
})
```

This rewrites icons to static JSX output with mask-image styling.

### Web Component Output

```ts
streamlineIcons({
  package: "@streamline-pkg/core-line-free",
  target: "web-component",
})
```

This rewrites icons to a generic `<streamline-icon>` custom element with static build-time registration of the referenced SVGs.

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

The demo now exercises the compile-time pack-based API against the sample workspace pack in `packages/packs/core-line-free`.

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
```

The live downloader is still under active development for full Streamline pagination, but the emitted package contract is already aligned with the compile-time plugin.

The current builder strategy for free packs is hybrid:

- official API endpoints are used for discovery and metadata
- public SVG URLs are preferred over the API SVG download endpoint
- website page-state is kept only as a fallback when required metadata or SVG content is missing
