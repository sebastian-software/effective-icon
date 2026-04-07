#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

PACK_SLUGS=(
  "core-line-free"
  "core-solid-free"
  "core-remix-free"
  "flex-line-free"
  "flex-solid-free"
  "flex-remix-free"
  "sharp-line-free"
  "sharp-solid-free"
  "sharp-remix-free"
  "plump-line-free"
  "plump-solid-free"
  "plump-remix-free"
  "material-pro-outlined-fill-free"
  "material-pro-outlined-line-free"
  "material-pro-rounded-fill-free"
  "material-pro-rounded-line-free"
  "material-pro-sharp-fill-free"
  "material-pro-sharp-line-free"
  "ultimate-light-free"
  "ultimate-regular-free"
  "ultimate-bold-free"
  "lucide-line"
)

echo "Checking npm authentication..."
npm whoami >/dev/null

echo "Running release pack validation..."
pnpm release:packs:check

echo
echo "Publishing missing release packs..."

published_count=0
skipped_count=0

for slug in "${PACK_SLUGS[@]}"; do
  pack_dir="$ROOT_DIR/packages/packs/$slug"

  if [[ ! -d "$pack_dir" ]]; then
    echo "Missing pack directory: $pack_dir" >&2
    exit 1
  fi

  package_name="$(
    node --input-type=module -e "import { readFileSync } from 'node:fs'; console.log(JSON.parse(readFileSync(process.argv[1], 'utf8')).name)" \
      "$pack_dir/package.json"
  )"

  if npm view "$package_name" version >/dev/null 2>&1; then
    echo "==> Skipping $slug ($package_name already exists on npm)"
    skipped_count=$((skipped_count + 1))
    continue
  fi

  echo
  echo "==> Publishing $slug ($package_name)"
  (
    cd "$pack_dir"
    npm publish --access public
  )
  published_count=$((published_count + 1))
done

echo
echo "Published $published_count pack(s); skipped $skipped_count existing pack(s)."
