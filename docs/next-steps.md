# Next Steps

## 1. Validate Against a Real Commercial Endpoint

- test the documented search-plus-download contract against a real Streamline API key
- confirm the real `familySlug` values for the free and paid families we want to support first
- keep the current contract stable unless a real commercial integration proves it insufficient

## 2. Replace Placeholder Free Assets

- decide the canonical source for Streamline Free exports
- implement and validate a real `sync:streamline` ingestion workflow
- normalize the complete free set into `assets/free/light`, `assets/free/regular`, and `assets/free/bold`
- document attribution and redistribution constraints before publishing

## 3. Harden Distribution

- verify that synced assets are included in the npm package reliably
- add a publish-time check that fails when required free asset folders are empty or missing
- decide whether assets live in git, are generated during release, or are pulled from a maintained cache/artifact

## 4. Expand Consumer-Facing Integration Coverage

- decide whether the virtual loader should keep returning raw SVG strings or a richer normalized payload
- define the stable contract for consumers that want to wrap icons into React/Vue/Solid components
- document expected caching behavior for repeated `loadIcon(name)` calls
- extend the fixture coverage from `free` and `api` to `directory` and `archive`

## 5. Prepare Ardo Integration

- add a generic external icon-loader registration path in Ardo
- migrate the Ardo docs homepage to use the external loader
- update `create-ardo` to scaffold the plugin in free mode
- remove `lucide-react` from the default scaffold once the migration is complete

## 6. Release Readiness

- add repository metadata, issue templates, and publishing workflow
- add usage docs for the eventual full free catalog once licensing is settled
