# Publishing `@effective/icon` for the First Time

The root package in this repository is:

- `@effective/icon`

This is the package that ships:

- `@effective/icon`
- `@effective/icon/vite-plugin`
- `@effective/icon/compile`
- `@effective/icon/runtime`

It is now part of the automated Release Please + trusted publishing flow in `.github/workflows/publish.yml`.

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

## Manual Fallback Publish

The normal path is the automated publish workflow. If a manual fallback is ever needed, run from the repository root:

```bash
pnpm release:root:publish
```

The script publishes with a repo-local npm cache for the same reason as the release check.

Because the root package has:

```json
"prepack": "pnpm build"
```

the `dist/` output is rebuilt automatically before `npm pack` and `npm publish`.

## Automation Notes

The automated workflow now handles:

1. Release Please versioning for the root package.
2. Release PR creation and tagging.
3. Trusted publishing of `@effective/icon` on successful release runs.

## Notes

- The builder package stays private and is not intended for npm publication.
- The demo packages stay private and are not release targets.
- The runtime and vite-plugin are subpath exports of `@effective/icon`, not separate npm packages.
