# API Manifest v1

## Canonical Location

The API source expects a manifest at:

```text
<baseUrl>/manifest.json
```

Example:

```ts
streamlineIcons({
  style: "regular",
  source: {
    type: "api",
    baseUrl: "https://example.com/streamline",
    headers: {
      Authorization: process.env.STREAMLINE_TOKEN ?? "",
    },
  },
})
```

## Canonical Shape

```json
{
  "icons": {
    "light": {
      "rocket": "./icons/light/rocket.svg"
    },
    "regular": {
      "rocket": "./icons/regular/rocket.svg",
      "search": "./icons/regular/search.svg"
    },
    "bold": {
      "rocket": "./icons/bold/rocket.svg"
    }
  }
}
```

Rules:

- top-level key is `icons`
- each style key maps icon names to SVG URLs
- supported styles are `light`, `regular`, and `bold`
- icon names are used as loader keys exactly as declared in the manifest
- SVG URLs may be absolute or relative

## URL Resolution

Relative URLs are resolved against the manifest URL, not against the bare `baseUrl` string.

If the manifest is served from:

```text
https://cdn.example.com/customer-a/icons/manifest.json
```

then:

```json
{
  "icons": {
    "regular": {
      "rocket": "./svg/rocket.svg"
    }
  }
}
```

resolves to:

```text
https://cdn.example.com/customer-a/icons/svg/rocket.svg
```

## Headers

`source.headers` are forwarded to:

- the manifest request
- every SVG request referenced by that manifest

This makes bearer-token or signed-header protected endpoints usable without a second auth layer in the plugin.

## Error Behavior

The build fails immediately when any of the following happens:

- `manifest.json` returns a non-2xx status
- the manifest body is not valid JSON
- the manifest does not match the canonical `{ icons: ... }` shape
- the requested style is missing from the manifest
- an icon entry contains an empty or invalid URL
- an SVG request returns a non-2xx status

The plugin intentionally fails fast here so remote source problems surface during the Vite build, not later at runtime.
