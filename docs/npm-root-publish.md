# Publishing `@effective/icon` for the First Time

The root package in this repository is:

- `@effective/icon`

This is the package that ships:

- `@effective/icon`
- `@effective/icon/vite-plugin`
- `@effective/icon/compile`
- `@effective/icon/runtime`

It is not yet part of the automated Release Please + trusted publishing flow. The intended first step is a one-time manual publish, so the package exists on npm and npm-side trusted publisher settings can be configured afterward.

## Release Check

Before the first publish, run:

```bash
pnpm release:root:check
```

This currently does all of the following:

- builds the root package
- typechecks the workspace
- runs the test suite
- runs `npm pack --dry-run` for `@effective/icon`

The check uses a repo-local npm cache so it does not depend on the state of `~/.npm`.

## First Manual Publish

Once the release check passes and the npm scope permissions are in place:

```bash
pnpm release:root:publish
```

Run that from the repository root.
The script publishes with a repo-local npm cache for the same reason as the release check.

Because the root package now has:

```json
"prepack": "pnpm build"
```

the `dist/` output is rebuilt automatically before `npm pack` and `npm publish`.

## After the First Publish

After `@effective/icon` exists on npm:

1. Configure npm trusted publishing for `@effective/icon`.
2. Point it at:
   - repository: `sebastian-software/effective-icon`
   - workflow: `.github/workflows/publish.yml`
   - branch: `main`
3. Then add the root package to the Release Please manifest/config and extend the publish workflow to release it automatically.

## Notes

- The builder package stays private and is not intended for npm publication.
- The demo packages stay private and are not release targets.
- The runtime and vite-plugin are subpath exports of `@effective/icon`, not separate npm packages.
