# Streamline API v1

## Official Endpoints

The current `api` source is modeled on Streamline's official API flow:

- `GET https://public-api.streamlinehq.com/v1/search/global`
- `GET https://public-api.streamlinehq.com/v1/icons/{hash}/download/svg`
- `GET https://public-api.streamlinehq.com/v1/icons/{hash}/download/svg?responsive=true`

The plugin uses the global-search response to find an icon hash, then downloads the SVG from the hash-based endpoint with `responsive=true`. This is required by the live API unless a fixed `size` is requested instead.

## Plugin Configuration

```ts
streamlineIcons({
  style: "light",
  source: {
    type: "api",
    apiKey: process.env.STREAMLINE_API_KEY ?? "",
    familySlug: "phosphor-light",
    icons: ["airplane", "add-1"],
    productTier: "free",
  },
})
```

Fields:

- `apiKey`: required private API key for the Streamline API
- `icons`: required list of icon names to resolve during the Vite build
- `familySlug`: recommended family disambiguator when the search API returns exact-name matches from multiple families
- `baseUrl`: optional override for testing or self-hosted proxies; defaults to `https://public-api.streamlinehq.com`
- `productTier`: optional filter for `all`, `free`, or `premium`

## Search Response Assumptions

The provider is aligned with the documented global-search response fields:

- `query`
- `results[].hash`
- `results[].name`
- `results[].imagePreviewUrl`
- `results[].isFree`
- `results[].familySlug`
- `results[].familyName`
- `results[].categorySlug`
- `results[].categoryName`
- `results[].subcategorySlug`
- `results[].subcategoryName`

The plugin only needs the hash and family metadata for resolution, but it validates the documented shape so bad upstream responses fail fast.

## Resolution Rules

For each requested icon name:

1. Search `GET /v1/search/global?productType=icons&query=<name>&style=<style>`
2. Normalize search result names and require an exact name match
3. If `familySlug` is provided, require the exact match to belong to that family
4. If multiple exact matches remain and no `familySlug` is set, fail with a disambiguation error
5. Download the final SVG with `GET /v1/icons/{hash}/download/svg?responsive=true`

This keeps the build deterministic and avoids silently choosing the wrong family.

## Authentication

Authentication follows the verified header-based API-key model:

```http
x-api-key: <apiKey>
```

The plugin sends that header to both the search and SVG-download requests.

## Private Key Handling

- keep `STREAMLINE_API_KEY` in your local shell environment, `.env.local`, or CI secret store
- never hardcode the key in source files
- never commit `.env` files containing the key
- treat the key as private even when you are only accessing free assets through the official API

## Error Behavior

The build fails immediately when any of the following happens:

- the search endpoint returns a non-2xx status
- the search body is not valid JSON
- the search response does not match the documented shape
- no exact icon match is found
- multiple exact matches exist and no `familySlug` disambiguates them
- the SVG download endpoint returns a non-2xx status

The plugin intentionally fails fast so API mismatches surface during the Vite build instead of later at runtime.
