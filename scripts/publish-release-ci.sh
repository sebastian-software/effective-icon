#!/usr/bin/env bash

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

PUBLISH_TARGETS=(
  ".:@effective/icon"
  "packages/packs/core-line-free:@icon-pkg/streamline-core-line-free"
  "packages/packs/core-solid-free:@icon-pkg/streamline-core-solid-free"
  "packages/packs/core-remix-free:@icon-pkg/streamline-core-remix-free"
  "packages/packs/flex-line-free:@icon-pkg/streamline-flex-line-free"
  "packages/packs/flex-solid-free:@icon-pkg/streamline-flex-solid-free"
  "packages/packs/flex-remix-free:@icon-pkg/streamline-flex-remix-free"
  "packages/packs/sharp-line-free:@icon-pkg/streamline-sharp-line-free"
  "packages/packs/sharp-solid-free:@icon-pkg/streamline-sharp-solid-free"
  "packages/packs/sharp-remix-free:@icon-pkg/streamline-sharp-remix-free"
  "packages/packs/plump-line-free:@icon-pkg/streamline-plump-line-free"
  "packages/packs/plump-solid-free:@icon-pkg/streamline-plump-solid-free"
  "packages/packs/plump-remix-free:@icon-pkg/streamline-plump-remix-free"
  "packages/packs/material-pro-outlined-fill-free:@icon-pkg/streamline-material-pro-outlined-fill-free"
  "packages/packs/material-pro-outlined-line-free:@icon-pkg/streamline-material-pro-outlined-line-free"
  "packages/packs/material-pro-rounded-fill-free:@icon-pkg/streamline-material-pro-rounded-fill-free"
  "packages/packs/material-pro-rounded-line-free:@icon-pkg/streamline-material-pro-rounded-line-free"
  "packages/packs/material-pro-sharp-fill-free:@icon-pkg/streamline-material-pro-sharp-fill-free"
  "packages/packs/material-pro-sharp-line-free:@icon-pkg/streamline-material-pro-sharp-line-free"
  "packages/packs/ultimate-light-free:@icon-pkg/streamline-ultimate-light-free"
  "packages/packs/ultimate-regular-free:@icon-pkg/streamline-ultimate-regular-free"
  "packages/packs/ultimate-bold-free:@icon-pkg/streamline-ultimate-bold-free"
  "packages/packs/lucide-line:@icon-pkg/streamline-lucide-line"
)

failures=()

publish_target() {
  local relative_dir="$1"
  local package_name="$2"
  local target_dir="$ROOT_DIR/$relative_dir"

  echo
  echo "==> Publishing $package_name"

  if [[ ! -d "$target_dir" ]]; then
    echo "Missing publish directory: $target_dir" >&2
    failures+=("$package_name (missing directory)")
    return 0
  fi

  if ! (
    cd "$target_dir"
    npm publish --access public
  ); then
    failures+=("$package_name")
  fi
}

for target in "${PUBLISH_TARGETS[@]}"; do
  IFS=":" read -r relative_dir package_name <<<"$target"
  publish_target "$relative_dir" "$package_name"
done

if [[ ${#failures[@]} -gt 0 ]]; then
  echo
  echo "Publish failures:"
  for failure in "${failures[@]}"; do
    echo " - $failure"
  done

  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
    {
      echo "## Publish failures"
      echo
      for failure in "${failures[@]}"; do
        echo "- $failure"
      done
    } >>"$GITHUB_STEP_SUMMARY"
  fi

  exit 1
fi

echo
echo "Published ${#PUBLISH_TARGETS[@]} target(s) successfully."
