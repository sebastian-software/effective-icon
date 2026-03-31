# ADR 0001: Separate `vite-plugin-streamline` Repository

## Status

Accepted

## Date

2026-03-31

## Context

We want a Streamline-focused icon integration that can be used by Ardo but is not tied to Ardo's runtime, configuration model, or release cadence.

The desired solution must:

- work as a standalone Vite plugin
- support a single global icon style (`light`, `regular`, `bold`)
- expose a lazy runtime loader through a virtual module
- support both built-in free assets and commercial customer-owned sources
- remain usable by non-Ardo Vite projects

Keeping this logic inside Ardo would couple:

- Streamline asset handling
- licensing and attribution concerns
- commercial source support
- virtual module design
- plugin releases

to a documentation framework that should only consume the result.

## Decision

We implement Streamline support as a separate repository and package named `vite-plugin-streamline`.

The package owns:

- source-provider resolution for `free`, `directory`, `archive`, and `api`
- manifest generation and icon name normalization
- Vite virtual modules for icon loading
- built-in free asset distribution
- future sync/import workflows for Streamline source material

Consumer frameworks such as Ardo integrate it by:

- installing the Vite plugin
- using the generated runtime loader
- mapping that loader into their own icon component model

## Consequences

### Positive

- clear product boundary and cleaner long-term ownership
- Ardo remains icon-source-agnostic
- easier reuse in non-Ardo Vite projects
- separate versioning for Streamline-specific behavior
- commercial source support can evolve without forcing Ardo API churn

### Negative

- additional repository, CI, release, and maintenance overhead
- built-in free asset handling and licensing must be managed here
- consumer integration requires an extra package and setup step

### Follow-up implications

- Ardo should later integrate via a generic external icon loader hook rather than hardcoding Streamline behavior
- the sync pipeline for official Streamline assets needs its own operational documentation before first public release
