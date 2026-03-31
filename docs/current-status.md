# Current Status

## Snapshot

Repository bootstrap is complete. The project builds, typechecks, and passes its current test suite.

Verified on 2026-03-31 with:

```bash
pnpm build
pnpm typecheck
pnpm test
npm pack --dry-run
```

## Implemented

- standalone package skeleton with `tsdown`, `vitest`, and TypeScript
- Vite plugin entrypoint in `src/plugin.ts`
- virtual loader module generation in `src/manifest.ts`
- provider model for:
  - `free`
  - `directory`
  - `archive`
  - `api`
- canonical Streamline API contract in `docs/streamline-api-v1.md`
- small built-in placeholder free asset set across:
  - `light`
  - `regular`
  - `bold`
- sync script scaffold in `scripts/sync-streamline.ts`
- baseline tests for:
  - icon name normalization
  - free source loading
  - directory source loading
  - archive source loading
  - API source loading
  - loader module generation
- fixture-backed Vite integration tests for:
  - `free`
  - `api`
  - lazy chunk emission

## Current Behavior

- one global style is selected at plugin setup time
- icons are exposed through `virtual:streamline-icons/loader`
- icon payloads are lazy-loaded per icon via virtual icon submodules
- free assets resolve from the package's `assets/free/<style>` directories
- commercial sources can already be pointed at local directories, zip archives, or the official Streamline API
- the `api` source is now the primary v1 remote-download path
- the `api` source uses Streamline's documented global-search and hash-based SVG download endpoints
- API auth is sent as `x-api-key: <apiKey>`
- SVG downloads are requested with `responsive=true`, which the live API currently requires unless a fixed size is provided
- exact-name matching is deterministic and `familySlug` is used for family disambiguation
- archive icons are loaded from zip contents in-memory, without leaving temp files behind

## Known Limitations

- built-in free assets are placeholders, not the full Streamline free catalog
- no official Streamline sync/import workflow has been validated yet
- no packaging rules yet ensure larger synced assets are included in release artifacts correctly
- API support is validated against the repo fixture contract and was smoke-tested on 2026-03-31 against the live Streamline API with a private local key
- built-in free asset licensing and redistribution still need release-grade documentation

## Handover Notes

- the repository is intentionally framework-agnostic; there is no Ardo dependency in the core package
- if Ardo integration starts next, prefer adding a generic async icon-loader bridge on the Ardo side instead of baking Streamline assumptions into Ardo
- keep the plugin API global-style-based; do not introduce per-instance collection or style selection unless there is a concrete user need
- treat `source: { type: "api" }` plus `docs/streamline-api-v1.md` as the normative first end-to-end commercial contract
