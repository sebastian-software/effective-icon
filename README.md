# @effective/icon

[![codecov](https://codecov.io/gh/sebastian-software/effective-icon/graph/badge.svg)](https://codecov.io/gh/sebastian-software/effective-icon)

Named icons without the runtime tax.

`@effective/icon` lets you author icons the way people actually want to use them:

```tsx
<Icon name="airplane" className="size-4" />
```

The API is the whole point.

One `name` prop. No per-icon imports scattered through the app. No giant switch statement. No hand-written registry. No component graveyard where every icon becomes another symbol to remember.

Most teams assume that if they want named icons, they have to pay for that convenience at runtime.

That tradeoff is so common it barely gets questioned:

- clean API means runtime registry
- name-based lookup means more JavaScript
- tintable output means inline SVG payload
- external asset files mean giving up ergonomics

`@effective/icon` exists because that tradeoff is not actually necessary.

It resolves the selected icon pack at build time, validates every icon name against the manifest, and rewrites your source usage to concrete output.

So you get the part people like:

- `<Icon name="...">`

without the usual cost:

- no runtime icon registry
- no per-icon component imports at call sites
- no shipping an icon library just to resolve names
- no need to push every icon into JS if an external `.svg` file is the better output

## You Really Can Have Both

This is the thing `@effective/icon` is built around:

- author by name
- validate by name
- emit only the icons you actually use
- keep them local to the chunks that reference them
- leave them as external assets when you want
- still support tintable output modes

That combination is the product.

It is the convenience of a runtime icon system with the output discipline of a static asset pipeline.

## The Problem With Most Icon Setups

Most current approaches force you into one of three compromises.

### Per-icon component libraries

This is the `lucide-react` model:

```tsx
import { Plane, Anchor } from "some-icon-library"
```

It works. It is also noisy.

- Every icon is another import.
- Every call site knows about library-specific component exports.
- Refactoring icon packs becomes a codebase-wide rename problem.
- Design-system naming and implementation naming drift apart fast.

You get explicitness. You lose the nice API.

### Runtime registries and dynamic lookup systems

This gets closer to the API people actually want:

```tsx
<Icon name="airplane" />
```

But many systems pay for that at runtime.

- The name lookup lives in JavaScript.
- The registry lives in JavaScript.
- The indirection lives in JavaScript.
- Static guarantees are weaker than they should be.

The API is better. The delivery path is heavier.

### Manual SVG imports

This is lean:

```tsx
import airplaneUrl from "./icons/airplane.svg"
```

But it is also tedious.

- Every icon import is manual.
- Every file repeats the same asset ceremony.
- Teams end up inventing their own local conventions.
- The code stays technically efficient while getting worse to work in.

The output is fine. The authoring experience is not.

## What @effective/icon Does Instead

`@effective/icon` is not trying to become another icon library.

It is a compile-time icon pipeline.

It reads the selected pack manifest during the build, validates the icon names you wrote in source, and rewrites them to the output form you actually want:

- `image` for external SVG URL output
- `mask` for tintable monochrome output with external assets
- `svg` for direct DOM SVG output

So you can keep named-icon authoring while still choosing the delivery strategy that fits the surface.

That is the real unlock.

## Why This Feels Better In Practice

For JSX targets, you keep the API people naturally reach for:

```tsx
<Icon name="airplane" />
```

And you still get:

- TypeScript validation of `name` from the selected pack
- build-time failure for missing icons
- only-used-icons emission
- chunk-local output instead of global icon baggage
- external `.svg` assets when you want browser caching and minimal JS
- tintable modes when you want icons to inherit `currentColor`

That last point matters more than it sounds.

Usually you pick two:

- nice API
- external assets
- tintability
- strict validation

`@effective/icon` is trying very hard to let you keep all four.

## The One-Sentence Pitch

`@effective/icon` gives you named-icon DX with the bundle behavior of a static asset pipeline.

## Install

```bash
pnpm add -D @effective/icon
```

Current plugin support targets Vite 8.

Add or install at least one compatible icon pack, for example:

```bash
pnpm add -D @icon-pkg/streamline-core-line-free
```

## Authoring

For the `jsx` surface, import the compile-time marker:

```tsx
import { Icon } from "@effective/icon/compile"
```

Then use it directly:

```tsx
<Icon name="airplane" className="size-4" />
```

The important detail is that this is a compile-time authoring surface for the plugin, not a runtime name-resolution system.

## SolidJS

The `jsx` surface is not React-specific. It works with JSX-based consumers such as SolidJS as long as the file still passes through the Vite transform pipeline.

```ts
import { defineConfig } from "vite"
import solid from "vite-plugin-solid"

import { effectiveIconVitePlugin } from "@effective/icon/vite-plugin"

export default defineConfig({
  plugins: [
    effectiveIconVitePlugin({
      package: "@icon-pkg/streamline-core-line-free",
      surface: "jsx",
      renderMode: "svg",
    }),
    solid(),
  ],
})
```

In a Solid component you can stay idiomatic and use `class`:

```tsx
import { Icon } from "@effective/icon/compile"

export function StatusCard() {
  return <Icon name="airplane" class="status-card__icon" aria-hidden="true" />
}
```

The workspace also includes real React and Solid demo apps, and the test suite builds a Solid fixture in `image`, `mask`, and `svg` modes.

## Testing

Run the node-side suite with:

```bash
pnpm test
```

Run the node-side suite with coverage enforcement and Codecov-compatible reports with:

```bash
pnpm test:coverage
```

Run the visual mask smoke checks in real browser mode with:

```bash
pnpm test:browser
```

Update the screenshot baselines with:

```bash
pnpm test:browser:update
```

The browser tests use Vitest Browser Mode with the Playwright provider. On macOS they automatically use the system Google Chrome binary when present. You can override that with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.
The CI workflow uploads `pnpm test:coverage` results to Codecov and enforces a global 90%+ line coverage target.

## Vite Config

```ts
import { defineConfig } from "vite"
import { effectiveIconVitePlugin } from "@effective/icon/vite-plugin"

export default defineConfig({
  plugins: [
    effectiveIconVitePlugin({
      package: "@icon-pkg/streamline-core-line-free",
      surface: "jsx",
      renderMode: "image",
    }),
  ],
})
```

By default, the plugin also generates a type-registration file for TypeScript:

- `src/effective-icon.generated.d.ts` when your project has a `src/` directory
- otherwise `effective-icon.generated.d.ts` in the project root

That file augments `@effective/icon/compile` with the icon-name union from the selected package, so `name="..."` becomes TypeScript-validated in editors and `tsc`.

If you want a custom path or want to disable generation, use `typesOutputFile`:

```ts
effectiveIconVitePlugin({
  package: "@icon-pkg/streamline-core-line-free",
  surface: "jsx",
  renderMode: "image",
  typesOutputFile: "./types/effective-icon.generated.d.ts",
})
```

Set `typesOutputFile: false` if you want to turn this off.

Like other generated routing or type-registration files, it is reasonable to check the generated file into git if you want CI and editors to see the exact same icon-name union without relying on a prior Vite run.

## Output Modes

### JSX Image Output

```ts
effectiveIconVitePlugin({
  package: "@icon-pkg/streamline-core-line-free",
  surface: "jsx",
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
effectiveIconVitePlugin({
  package: "@icon-pkg/streamline-core-line-free",
  surface: "jsx",
  renderMode: "mask",
})
```

This emits JSX with mask-image styling and keeps the icon asset external.

Use it when you want:

- external `.svg` files
- runtime tinting via `currentColor`
- monochrome UI glyphs with small JS overhead

### JSX SVG Output

```ts
effectiveIconVitePlugin({
  package: "@icon-pkg/streamline-core-line-free",
  surface: "jsx",
  renderMode: "svg",
})
```

This emits inline `<svg>` markup into the transformed JSX.

Use it when you want:

- direct DOM-level SVG control
- the easiest path for `currentColor`
- CSS and accessibility control on the final `<svg>`

This mode assumes the icon pack already ships normalized, inline-safe SVG assets.
The builder pipeline owns that normalization and validation step; the Vite transform does not run SVGO or broad SVG repair at app-build time.

## Rules

The plugin is intentionally strict.

- `package` must be an explicit package name
- `name` must be a static string literal
- spread props are rejected
- children are rejected
- unknown icon names fail the build
- `<Icon ...>` is only valid for `surface: "jsx"`
- marker imports are only required for the JSX surface

That strictness is not accidental. It is what allows `@effective/icon` to behave like a real compile-time pipeline instead of a best-effort runtime helper.

## Icon Pack Contract

Compatible icon packages are expected to ship:

- `manifest.json`
- `icons/*.svg`
- `index.html`
- `exports["./manifest.json"]`
- `exports["./icons/*"]`

The plugin reads the manifest during build setup and resolves icon file paths from it.

## Current Status

The current V1 direction is deliberately narrow:

- one selected icon package per project
- `<Icon ...>` authoring for the `jsx` surface
- static validation against the selected package manifest
- build-time rewrites for:
  - JSX image output
  - JSX mask output
  - JSX SVG output

The repo also contains the Streamline pack builder workspace that produces pack packages with:

- `manifest.json`
- `icons/*.svg`
- package exports for both

## Demo

```bash
pnpm build:demo
pnpm dev:demo
```

The public demo is structured as six real pnpm workspace apps grouped by integration path:

- `pnpm dev:demo` starts all demo dev servers together
- `pnpm dev:demo:react:image`
- `pnpm dev:demo:react:mask`
- `pnpm dev:demo:react:svg`
- `pnpm dev:demo:solid:image`
- `pnpm dev:demo:solid:mask`
- `pnpm dev:demo:solid:svg`

Default local ports:

- `http://127.0.0.1:4174/` for `react/image`
- `http://127.0.0.1:4175/` for `react/mask`
- `http://127.0.0.1:4176/` for `react/svg`
- `http://127.0.0.1:4177/` for `solid/image`
- `http://127.0.0.1:4178/` for `solid/mask`
- `http://127.0.0.1:4179/` for `solid/svg`

`pnpm build:demo` builds the public Pages artifact into `demo/dist`: the React and Solid demo matrix plus static pack galleries for the currently released Streamline packs.

## Builder Workspace

The builder workspace lives under `packages/streamline-builder` and produces downstream icon pack packages with a static `index.html` gallery, README links to GitHub Pages, and the manifest + SVG payload used by the compile-time plugin.

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

## Publishing the Current Pack Set

The current npm release set is intentionally scoped to the nine materialized pack workspaces tracked in this repository:

- `@icon-pkg/streamline-core-line-free`
- `@icon-pkg/streamline-core-solid-free`
- `@icon-pkg/streamline-core-remix-free`
- `@icon-pkg/streamline-flex-line-free`
- `@icon-pkg/streamline-flex-solid-free`
- `@icon-pkg/streamline-flex-remix-free`
- `@icon-pkg/streamline-sharp-line-free`
- `@icon-pkg/streamline-sharp-solid-free`
- `@icon-pkg/streamline-sharp-remix-free`
- `@icon-pkg/streamline-plump-line-free`
- `@icon-pkg/streamline-plump-solid-free`
- `@icon-pkg/streamline-plump-remix-free`
- `@icon-pkg/streamline-material-pro-outlined-fill-free`
- `@icon-pkg/streamline-material-pro-outlined-line-free`
- `@icon-pkg/streamline-material-pro-rounded-fill-free`
- `@icon-pkg/streamline-material-pro-rounded-line-free`
- `@icon-pkg/streamline-material-pro-sharp-fill-free`
- `@icon-pkg/streamline-material-pro-sharp-line-free`
- `@icon-pkg/streamline-ultimate-light-free`
- `@icon-pkg/streamline-ultimate-regular-free`
- `@icon-pkg/streamline-ultimate-bold-free`

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

## License

MIT licensed.  
Copyright (c) 2026 Sebastian Software GmbH, Mainz, Germany.  
OSS home: [oss.sebastian-software.com](https://oss.sebastian-software.com)
