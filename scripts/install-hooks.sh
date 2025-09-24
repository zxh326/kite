#!/bin/bash

# Install Git hooks for the project
# This script creates a pre-commit hook that runs make pre-commit

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
HOOKS_DIR="$PROJECT_ROOT/.git/hooks"

# Check if we're in a git repository
if [[ ! -d "$PROJECT_ROOT/.git" ]]; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Create hooks directory if it doesn't exist
mkdir -p "$HOOKS_DIR"

# Create pre-commit hook
PRE_COMMIT_HOOK="$HOOKS_DIR/pre-commit"

cat > "$PRE_COMMIT_HOOK" << 'EOF'
#!/bin/bash

# Git pre-commit hook
# Runs make pre-commit to ensure code quality and handles auto-formatting

set -e

echo "🔍 Running pre-commit checks..."

# Change to project root directory
cd "$(git rev-parse --show-toplevel)"

# Check if there are any staged files
if git diff --cached --quiet; then
    echo "ℹ️  No staged changes found"
    exit 0
fi

# Store the list of staged files before running pre-commit
STAGED_FILES=$(git diff --cached --name-only)

# Run pre-commit checks
if ! make pre-commit; then
    echo "❌ Pre-commit checks failed!"
    echo "Please fix the issues above and try committing again."
    echo "To skip pre-commit checks, use 'git commit --no-verify'"
    exit 1
fi

# Check if any of the staged files were modified by pre-commit
MODIFIED_FILES=""
for file in $STAGED_FILES; do
    if [[ -f "$file" ]] && ! git diff --quiet HEAD -- "$file" 2>/dev/null; then
        # Check if the file has unstaged changes (was modified by pre-commit)
        if ! git diff --quiet -- "$file" 2>/dev/null; then
            MODIFIED_FILES="$MODIFIED_FILES $file"
        fi
    fi
done

# If files were auto-formatted, add them to the staging area
if [[ -n "$MODIFIED_FILES" ]]; then
    echo "🔧 Auto-formatting detected, adding modified files to staging area:"
    for file in $MODIFIED_FILES; do
        echo "   - $file"
        git add "$file"
    done
    echo "✅ Modified files have been staged for commit"
fi

echo "✅ Pre-commit checks passed!"
exit 0
EOF

# Make the hook executable
chmod +x "$PRE_COMMIT_HOOK"

echo "✅ Git pre-commit hook installed successfully!"
echo "   The hook will run 'make pre-commit' before each commit."
echo ""
echo "To disable the hook temporarily, use:"
echo "   git commit --no-verify"
echo ""
echo "To uninstall the hook, delete:"
echo "   $PRE_COMMIT_HOOK"