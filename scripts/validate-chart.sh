#!/bin/bash

# Helm Chart Validation Script
# This script validates the Helm chart configuration before release

set -euo pipefail

CHART_DIR="chart"
TEMP_DIR=$(mktemp -d)

echo "🔍 Validating Helm Chart..."

# Check if chart directory exists
if [ ! -d "$CHART_DIR" ]; then
    echo "❌ Chart directory '$CHART_DIR' not found"
    exit 1
fi

# Check if Chart.yaml exists
if [ ! -f "$CHART_DIR/Chart.yaml" ]; then
    echo "❌ Chart.yaml not found in '$CHART_DIR'"
    exit 1
fi

# Validate Chart.yaml structure
echo "📋 Checking Chart.yaml structure..."
if ! grep -q "^name:" "$CHART_DIR/Chart.yaml"; then
    echo "❌ Chart name not found in Chart.yaml"
    exit 1
fi

if ! grep -q "^version:" "$CHART_DIR/Chart.yaml"; then
    echo "❌ Chart version not found in Chart.yaml"
    exit 1
fi

echo "✅ Chart.yaml structure is valid"

# Lint the chart
echo "🔍 Linting Helm chart..."
if helm lint "$CHART_DIR"; then
    echo "✅ Chart linting passed"
else
    echo "❌ Chart linting failed"
    exit 1
fi

# Test chart packaging
echo "📦 Testing chart packaging..."
if helm package "$CHART_DIR" --destination "$TEMP_DIR"; then
    echo "✅ Chart packaging successful"
    PACKAGE_FILE=$(ls "$TEMP_DIR"/*.tgz)
    echo "📦 Package created: $(basename "$PACKAGE_FILE")"
else
    echo "❌ Chart packaging failed"
    exit 1
fi

# Test template rendering
echo "🔧 Testing template rendering..."
if helm template test-release "$CHART_DIR" > "$TEMP_DIR/rendered.yaml"; then
    echo "✅ Template rendering successful"
else
    echo "❌ Template rendering failed"
    exit 1
fi

# Validate rendered YAML
echo "📋 Validating rendered YAML..."
if kubectl apply --dry-run=client -f "$TEMP_DIR/rendered.yaml" > /dev/null 2>&1; then
    echo "✅ Rendered YAML is valid"
else
    echo "❌ Rendered YAML validation failed"
    exit 1
fi

# Test with different values
echo "🔧 Testing with custom values..."
cat > "$TEMP_DIR/test-values.yaml" << EOF
replicaCount: 2
image:
  tag: "test"
service:
  type: LoadBalancer
multiCluster:
  enabled: true
EOF

if helm template test-release "$CHART_DIR" -f "$TEMP_DIR/test-values.yaml" > "$TEMP_DIR/rendered-custom.yaml"; then
    echo "✅ Custom values rendering successful"
else
    echo "❌ Custom values rendering failed"
    exit 1
fi

# Clean up
rm -rf "$TEMP_DIR"

echo "🎉 All validations passed! Chart is ready for release."