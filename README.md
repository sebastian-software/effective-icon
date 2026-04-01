# iconkit

Named icons without the runtime tax.

`iconkit` lets you author icons the way people actually want to use them:

```tsx
<Icon name="airplane" className="size-4" />
```

or:

```tsx
{icon`anchor`}
```

That API is the whole point.

One icon surface. One `name` prop. No per-icon imports scattered through the app. No giant switch statement. No hand-written registry. No component graveyard where every icon becomes another symbol to remember.

Most teams assume that if they want named icons, they have to pay for that convenience at runtime.

That tradeoff is so common it barely gets questioned:

- clean API means runtime registry
- name-based lookup means more JavaScript
- tintable output means inline SVG payload
- external asset files mean giving up ergonomics

`iconkit` exists because that tradeoff is not actually necessary.

It resolves the selected icon pack at build time, validates every icon name against the manifest, and rewrites your marker usage to concrete output.

So you get the part people like:

- `<Icon name="...">`
- ``icon`anchor` ``
- a single icon abstraction for the whole app

without the usual cost:

- no runtime icon registry
- no per-icon component imports at call sites
- no shipping an icon library just to resolve names
- no need to push every icon into JS if an external `.svg` file is the better output

## You Really Can Have Both

This is the thing `iconkit` is built around:

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

## What iconkit Does Instead

`iconkit` is not trying to become another icon library.

It is a compile-time icon pipeline.

It reads the selected pack manifest during the build, validates the icon names you wrote in source, and rewrites them to the output form you actually want:

- `image` for external SVG URL output
- `mask` for tintable monochrome output with external assets
- `inline-svg` for direct DOM SVG output
- `web-component` for framework-agnostic tintable output with external assets

So the same authoring code can compile down to different delivery strategies without changing every call site in your app.

That is the real unlock.

## Why This Feels Better In Practice

You keep the API people naturally reach for:

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

`iconkit` is trying very hard to let you keep all four.

## The One-Sentence Pitch

`iconkit` gives you the DX of `<Icon name="...">` with the bundle behavior of a static asset pipeline.

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
{icon`anchor`}
```

For the template-tag form, descriptive names like `anchor`, `airplane`, or `calendar-add` read much better than abstract internal-looking IDs.

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

By default, the plugin also generates a type-registration file for TypeScript:

- `src/iconkit.generated.d.ts` when your project has a `src/` directory
- otherwise `iconkit.generated.d.ts` in the project root

That file augments `iconkit/compile` with the icon-name union from the selected package, so `name="..."` becomes TypeScript-validated in editors and `tsc`.

If you want a custom path or want to disable generation, use `typesOutputFile`:

```ts
iconkitVitePlugin({
  package: "@icon-pkg/streamline-core-line-free",
  target: "jsx",
  renderMode: "image",
  typesOutputFile: "./types/iconkit.generated.d.ts",
})
```

Set `typesOutputFile: false` if you want to turn this off.

Like other generated routing or type-registration files, it is reasonable to check the generated file into git if you want CI and editors to see the exact same icon-name union without relying on a prior Vite run.

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

## License

MIT licensed.  
Copyright (c) 2026 Sebastian Software GmbH, Mainz, Germany.  
OSS home: [oss.sebastian-software.com](https://oss.sebastian-software.com)
