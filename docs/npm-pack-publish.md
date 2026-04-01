# Publishing the Initial Streamline Packs

This repository currently publishes exactly three npm packages under the public `@icon-pkg` scope:

- `@icon-pkg/streamline-core-line-free`
- `@icon-pkg/streamline-core-solid-free`
- `@icon-pkg/streamline-core-remix-free`

They are versioned in lockstep and are published from the materialized workspace directories in `packages/packs/*`.

## Preflight

1. Confirm you are authenticated with npm:

   ```bash
   npm whoami
   ```

2. Confirm your npm account has publish rights for the `@icon-pkg` scope.
3. Ensure the repo is in a releasable state and the three pack directories contain the intended artifacts.

## Release Check

Run the dedicated release validation before every publish:

```bash
pnpm release:packs:check
```

This verifies:

- the release set contains the expected three pack workspaces
- `manifest.json` and `package.json` are on the shared release version
- npm metadata required for public publish is present
- all referenced icon files exist
- `npm pack --dry-run` succeeds for each package

## Publish

Publish the release set in the configured order:

```bash
pnpm release:packs:publish
```

The command:

- re-runs the release checks
- verifies npm authentication via `npm whoami`
- publishes each pack with `npm publish --access public`
- stops on the first failure

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

This first release flow is intentionally manual. Future expansion can add:

- GitHub Actions or trusted publishing
- a broader release set
- independent pack versioning
