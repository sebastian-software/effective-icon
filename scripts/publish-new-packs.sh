#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

PACK_SLUGS=(
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
echo "Publishing new pack set..."

for slug in "${PACK_SLUGS[@]}"; do
  pack_dir="$ROOT_DIR/packages/packs/$slug"

  if [[ ! -d "$pack_dir" ]]; then
    echo "Missing pack directory: $pack_dir" >&2
    exit 1
  fi

  echo
  echo "==> Publishing $slug"
  (
    cd "$pack_dir"
    npm publish --access public
  )
done

echo
echo "Published ${#PACK_SLUGS[@]} pack(s)."
