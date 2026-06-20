#!/usr/bin/env bash
# Usage: bash .claude/skills/uigen-guide/scripts/find-usages.sh <term>
# Searches src/ for imports, references, and usages of the given term.

TERM="${1:?Usage: $0 <term>}"
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

echo "=== Searching for: $TERM ==="
echo ""

echo "--- Import statements ---"
grep -rn --include="*.ts" --include="*.tsx" "import.*$TERM" "$ROOT/src" | grep -v node_modules || echo "(none)"

echo ""
echo "--- Direct references ---"
grep -rn --include="*.ts" --include="*.tsx" "$TERM" "$ROOT/src" | grep -v "import " | grep -v node_modules | grep -v "__tests__" || echo "(none)"

echo ""
echo "--- Test files ---"
grep -rn --include="*.test.ts" --include="*.test.tsx" "$TERM" "$ROOT/src" | grep -v node_modules || echo "(none)"
