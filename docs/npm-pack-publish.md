# Publishing the Initial Streamline Packs

This repository currently publishes exactly three npm packages under the public `@icon-pkg` scope:

- `@icon-pkg/streamline-core-line-free`
- `@icon-pkg/streamline-core-solid-free`
- `@icon-pkg/streamline-core-remix-free`

They are published from the materialized workspace directories in `packages/packs/*`.

## Automated Release Flow

The repository now uses Release Please plus npm trusted publishing for these three packages only:

- `packages/packs/core-line-free`
- `packages/packs/core-solid-free`
- `packages/packs/core-remix-free`

On pushes to `main`:

1. Release Please updates or opens the release PR for the configured pack paths.
2. When that release PR is merged, Release Please tags the released packages.
3. The publish job validates the release set and publishes only the packages that actually released in that run.

The publish workflow uses GitHub Actions OIDC trusted publishing on Node `24`, so it does not require an `NPM_TOKEN`.

The root package `@effective/icon` is not part of this automated flow yet.
Its one-time bootstrap publish is documented separately in [npm-root-publish.md](/Users/sebastian/Workspace/vite-plugin-streamline/docs/npm-root-publish.md).

## One-Time npm Setup

Trusted publishing still requires an initial npm-side setup for each package.

Configure a trusted publisher on npmjs.com for each of:

- `@icon-pkg/streamline-core-line-free`
- `@icon-pkg/streamline-core-solid-free`
- `@icon-pkg/streamline-core-remix-free`

Point each package at this repository and workflow:

- repository: `sebastian-software/effective-icon`
- workflow file: `.github/workflows/publish.yml`
- environment: none
- branch: `main`

## Preflight

1. Ensure the npm trusted publisher entries exist for all three packages.
2. Ensure the repo is in a releasable state and the three pack directories contain the intended artifacts.
3. Ensure changes intended for release use Conventional Commits so Release Please can version them correctly.

## Release Check

Run the dedicated release validation before every publish or workflow change:

```bash
pnpm release:packs:check
```

This verifies:

- the release set contains the expected three pack workspaces
- `manifest.json` and `package.json` are on the shared release version
- npm metadata required for public publish is present
- all referenced icon files exist
- `npm pack --dry-run` succeeds for each package

## Manual Fallback Publish

The normal path is the automated workflow. Manual `npm publish` should only be used as an emergency fallback.

If a manual fallback is necessary, run:

```bash
pnpm release:packs:check
```

## Post-Publish Verification

After publishing:

1. Open the npm package pages and confirm the packages are public under `@icon-pkg`.
2. Install one package in a clean temp directory:

   ```bash
   npm install @icon-pkg/streamline-core-line-free
   ```

3. Verify both of these resolve correctly:

   ```bash
   node --input-type=module -e "import manifest from '@icon-pkg/streamline-core-line-free/manifest.json' with { type: 'json' }; console.log(manifest.iconCount)"
   ```

   ```bash
   node --input-type=module -e "console.log(import.meta.resolve('@icon-pkg/streamline-core-line-free/icons/airplane.svg'))"
   ```

## Later Expansion

Future expansion can add:

- the root `@effective/icon` package
- a broader release set beyond the first three icon packs
- tighter path filtering or more package-specific publish checks
