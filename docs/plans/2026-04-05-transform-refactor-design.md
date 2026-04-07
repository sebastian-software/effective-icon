# Transform Refactor Design

## Goal

Split `src/transform.ts` into smaller internal modules without changing the public entrypoint or emitted output.

Secondary goals:

- make the transform logic easier to test in isolation
- reduce the amount of partial coverage concentrated in one file
- keep `transformCompileTimeIcons()` as the only public transform API

## Chosen Approach

Use internal helper modules with explicit exports for pure logic and AST helpers.

The public API stays:

- `transformCompileTimeIcons()`
- `COMPILE_MODULE_ID`
- `RUNTIME_MODULE_ID`

New internal modules:

- `src/transform-mask.ts`
  - inline mask style generation
  - CSS property normalization
- `src/transform-jsx.ts`
  - JSX attribute helpers
  - class merging
  - accessibility fallbacks
  - import statement builders
- `src/transform-svg.ts`
  - SVG parsing
  - JSX AST cloning helpers

`src/transform.ts` keeps:

- transform orchestration
- `TransformState`
- compile import discovery
- file kind heuristics
- icon element rewriting

## Constraints

- no behavior changes in React, Solid, image, mask, or svg paths
- no new public package exports
- no runtime changes
- tests should continue to assert transformed output, not internal implementation details

## Testing

- keep existing transform integration tests
- add focused tests for extracted helpers where that improves coverage density
- verify with `typecheck`, `test`, and `test:coverage`
