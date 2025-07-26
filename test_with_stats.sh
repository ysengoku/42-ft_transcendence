#!/bin/bash

# Test runner with statistics
# Usage: ./test_with_stats.sh [module_name] [--fresh-db]

echo "🧪 Running Django Tests with Statistics"
echo "========================================"
echo "📝 Legend: . = passed ✅ | F = failed ❌ | E = error 💥"
echo ""

if ! docker compose ps server | grep -q "Up"; then
    echo "❌ Error: Docker containers are not running!"
    echo "Please run 'make up' first to start the containers."
    exit 1
fi

if [[ "$*" == *"--fresh-db"* ]]; then
    echo "🔄 Using fresh database"
    TEST_OPTIONS="--verbosity=1"
else
    echo "🚀 Using default database setup with --keepdb"
    TEST_OPTIONS="--verbosity=1 --keepdb"
fi

if [ -z "$1" ] || [ "$1" = "--fresh-db" ]; then
    echo "🎯 Running ALL tests..."
    echo "=========================================="
    output=$(docker compose exec -T server python manage.py test $TEST_OPTIONS --verbosity=2 2>&1)
    echo "$output"
else
    MODULE="$1"
    echo "🎯 Running tests for: $MODULE"
    echo "=========================================="
    output=$(docker compose exec -T server python manage.py test "$MODULE" $TEST_OPTIONS --verbosity=2 2>&1)
    echo "$output"
fi

echo ""
echo "=========================================="

# Extract statistics from test output
total=$(echo "$output" | grep -o "Ran [0-9]* test" | grep -o "[0-9]*" | head -1)
failures=$(echo "$output" | grep -o "failures=[0-9]*" | grep -o "[0-9]*" | head -1)
errors=$(echo "$output" | grep -o "errors=[0-9]*" | grep -o "[0-9]*" | head -1)

# Set defaults if empty
total=${total:-0}
failures=${failures:-0}
errors=${errors:-0}

# Calculate passed tests and percentages
passed=$((total - failures - errors))
if [ "$total" -gt 0 ]; then
    passed_pct=$((passed * 100 / total))
    failed_pct=$((failures * 100 / total))
    errors_pct=$((errors * 100 / total))
    success_pct=$passed_pct
else
    passed_pct=0
    failed_pct=0
    errors_pct=0
    success_pct=0
fi

# Display summary
echo ""
echo "📊 SUMMARY"
echo "=========="
echo "Total tests: $total"
echo "✅ Passed: $passed ($passed_pct%)"
echo "❌ Failed: $failures ($failed_pct%)" 
echo "💥 Errors: $errors ($errors_pct%)"
echo "🎯 Success rate: $success_pct%"

# Status indicator
if [ "$success_pct" -ge 90 ]; then
    echo "🟢 Status: EXCELLENT"
elif [ "$success_pct" -ge 70 ]; then
    echo "🟡 Status: GOOD"
else
    echo "🔴 Status: NEEDS WORK"
fi

echo "========================================"