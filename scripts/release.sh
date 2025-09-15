#!/bin/bash

set -x

version="$1"
CHART_DIR="charts/kite"
if [ -z "$version" ]; then
  echo "❌ Version argument is required"
  exit 1
fi
current_version=$(grep '^version:' "$CHART_DIR/Chart.yaml" | awk '{print $2}')

echo "🚀 Releasing Helm Chart version $current_version to $version..."

if command -v gsed >/dev/null 2>&1; then
  SED_CMD=gsed
else
  SED_CMD=sed
fi

$SED_CMD -i "s/$current_version/$version/g" "$CHART_DIR/Chart.yaml"
$SED_CMD -i "s/$current_version/$version/g" "$CHART_DIR/README.md"

git add "$CHART_DIR/Chart.yaml" "$CHART_DIR/README.md"
git commit -m "release v$version"
git tag -a "v$version" -m "version $version"