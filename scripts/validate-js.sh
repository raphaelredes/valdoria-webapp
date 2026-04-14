#!/bin/bash
# validate-js.sh — Scan all JS files for syntax errors before commit
# Usage: bash scripts/validate-js.sh
# Returns exit code 1 if any errors found

ERRORS=0
CHECKED=0
FAILED_FILES=""

for f in $(find . -name "*.js" \
    -not -path "./node_modules/*" \
    -not -path "./.git/*" \
    -not -path "./shared/three.min.js" \
    -not -path "./mockups/*" \
    2>/dev/null); do
    CHECKED=$((CHECKED + 1))
    result=$(node -c "$f" 2>&1)
    if [ $? -ne 0 ]; then
        ERRORS=$((ERRORS + 1))
        FAILED_FILES="$FAILED_FILES\n  $f"
        echo "FAIL: $f"
        echo "$result" | head -5
        echo ""
    fi
done

echo "=== JS Syntax Scan: $CHECKED files checked, $ERRORS errors ==="
if [ $ERRORS -gt 0 ]; then
    echo -e "Failed files:$FAILED_FILES"
    exit 1
fi
exit 0
