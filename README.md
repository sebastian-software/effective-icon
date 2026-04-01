# iconkit

Named icons without the runtime tax.

`iconkit` lets you author icons the way people actually want to use them:

```tsx
<Icon name="airplane" className="size-4" />
```

or:

```tsx
{icon`add-1`}
```

That API is the whole point. A single icon surface. One `name` prop. No per-icon imports sprinkled through your app. No giant switch statement. No hand-written registry.

The interesting part is what happens next: `iconkit` does not keep that convenience as a runtime abstraction. It resolves the icon package at build time, validates the icon name against the package manifest, and rewrites the marker to the concrete output you selected.

That means you get the ergonomics of a name-based icon component without paying the usual price for it.

- Only the icons you actually use are emitted.
- They only end up in the chunks that reference them.
- They can stay external `.svg` assets instead of getting stuffed into your JavaScript bundle.
- `mask` and `web-component` output stay tintable via `currentColor`.

That is the pitch in one sentence: the DX of `<Icon name="...">`, with output characteristics much closer to a static asset pipeline.

MIT licensed.  
Copyright (c) 2026 Sebastian Software GmbH, Mainz, Germany.  
OSS home: [oss.sebastian-software.com](https://oss.sebastian-software.com)

## Why This Exists

Most icon setups make you choose between ergonomics and output quality.

### 1. Per-icon component libraries

This is the `lucide-react` style:

```tsx
import { Plane, Anchor } from "some-icon-library"
```

That works, but it scales badly in real codebases.

- Every icon becomes another import.
- Every call site now depends on a component name instead of the icon name your design system actually cares about.
- Swapping icon packs or standardizing naming gets harder because your app code is coupled to library-specific component exports.

It is explicit. It is also noisy.

### 2. Runtime registries or lookup-based icon systems

These get closer to the ideal API:

```tsx
<Icon name="airplane" />
```

Much nicer. But many of these systems pay for that convenience at runtime.

- They keep a registry in JavaScript.
- They look icons up by name in the browser.
- They often move icon-related logic into your client bundle.
- Static validation is weaker unless you build extra tooling around it.

So the API feels right, but the delivery path is heavier than it needs to be.

### 3. Raw SVG or asset imports

This is lean and predictable:

```tsx
import airplaneUrl from "./icons/airplane.svg"
```

But now you are back to repetitive asset management.

- Every icon import is manual.
- Every codebase invents its own conventions.
- Standardizing icon usage across a team becomes harder than it should be.

You get good output, but poor authoring ergonomics.

### 4. iconkit

`iconkit` is trying to keep the part people actually like and remove the cost they usually accept as inevitable.

- Author icons by name.
- Validate those names at build time.
- Rewrite them to concrete assets at build time.
- Emit only the icons that are actually referenced.
- Keep assets external when that is the better output.
- Still support tintable rendering modes.

You can have the clean `<Icon name="...">` API and still ship something that behaves like a disciplined asset pipeline.

## What Makes It Different

The key distinction is simple:

`iconkit` is not an icon library. It is a compile-time icon pipeline.

It does not want to own your icon set in runtime code. It wants to:

1. read a pack manifest during the build
2. validate icon references against that manifest
3. rewrite those references to the output form you chose

That changes the tradeoff completely.

### What you keep

- A pleasant authoring API
- A single icon abstraction for your app
- Pack-level validation
- Output flexibility

### What you avoid

- Runtime icon registries
- Bundling a component export for every icon
- Repetitive import boilerplate at call sites
- Shipping icons in JS when a plain asset file would do

## The Real Promise

If someone asks what `iconkit` actually buys them, the answer is this:

- named icon authoring
- compile-time validation
- chunk-local emission of only the icons you use
- optional external SVG assets
- tintable output modes when you need them
- one pack selected per project, which keeps the output deterministic

That combination is the reason this exists.

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

The important detail is that these are markers for the plugin, not a runtime component system.

## Vite Config

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

## Output Modes

### JSX Image Output

```ts
iconkitVitePlugin({
  package: "@icon-pkg/streamline-core-line-free",
  target: "jsx",
  renderMode: "image",
})
```

This emits image-style JSX backed by external URL imports.

Use it when you want:

- simple static asset output
- no icon payload inside JavaScript
- straightforward browser caching of `.svg` files

### JSX Mask Output

```ts
iconkitVitePlugin({
  package: "@icon-pkg/streamline-core-line-free",
  target: "jsx",
  renderMode: "mask",
})
```

This emits JSX with mask-image styling and keeps the icon asset external.

Use it when you want:

- external `.svg` files
- runtime tinting via `currentColor`
- monochrome UI glyphs with small JS overhead

### JSX Inline SVG Output

```ts
iconkitVitePlugin({
  package: "@icon-pkg/streamline-core-line-free",
  target: "jsx",
  renderMode: "inline-svg",
})
```

This emits inline `<svg>` markup into the transformed JSX.

Use it when you want:

- direct DOM-level SVG control
- the easiest path for `currentColor`
- CSS and accessibility control on the final `<svg>`

### Web Component Output

```ts
iconkitVitePlugin({
  package: "@icon-pkg/streamline-core-line-free",
  target: "web-component",
})
```

This emits a generic `<iconkit-icon>` custom element. The icon still resolves to an external SVG asset URL and is rendered as a tintable mask-based glyph inside shadow DOM.

Use it when you want:

- a framework-agnostic consumer surface
- external assets instead of raw SVG strings in JS
- tintable output with a stable custom element API

## Rules

The plugin is intentionally strict.

- `package` must be an explicit package name
- `name` must be a static string literal
- template-tag usage must not contain interpolation
- spread props are rejected
- children are rejected
- unknown icon names fail the build
- marker imports are required

That strictness is not accidental. It is what allows `iconkit` to behave like a real compile-time pipeline instead of a best-effort runtime helper.

## Icon Pack Contract

Compatible icon packages are expected to ship:

- `manifest.json`
- `icons/*.svg`
- `exports["./manifest.json"]`
- `exports["./icons/*"]`

The plugin reads the manifest during build setup and resolves icon file paths from it.

## Current Status

The current V1 direction is deliberately narrow:

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

## Demo

```bash
pnpm build:demo
pnpm dev:demo
```

The demo is structured as four real pnpm workspace apps that share most of their content and UI:

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

The builder workspace lives under `packages/streamline-builder` and produces downstream icon pack packages.

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
