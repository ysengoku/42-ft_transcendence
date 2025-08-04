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
    echo "🎯 Running ALL tests by module..."
    echo "=========================================="
    
    modules=("users" "chat" "pong" "tournaments")
    total_passed=0
    total_failed=0
    total_errors=0
    total_tests=0
    
    for module in "${modules[@]}"; do
        echo ""
        echo "🔄 Testing module: $module"
        echo "----------------------------------------"
        
        # Run tests for this module and capture output in real-time
        module_output=$(docker compose exec -T server python manage.py test "$module" $TEST_OPTIONS --verbosity=2 2>&1 | tee /dev/stderr)
        
        # Extract stats for this module
        module_total=$(echo "$module_output" | grep -o "Ran [0-9]* test" | grep -o "[0-9]*" | head -1)
        module_failures=$(echo "$module_output" | grep -o "failures=[0-9]*" | grep -o "[0-9]*" | head -1)
        module_errors=$(echo "$module_output" | grep -o "errors=[0-9]*" | grep -o "[0-9]*" | head -1)
        
        # Set defaults if empty
        module_total=${module_total:-0}
        module_failures=${module_failures:-0}
        module_errors=${module_errors:-0}
        
        module_passed=$((module_total - module_failures - module_errors))
        
        # Update totals
        total_tests=$((total_tests + module_total))
        total_passed=$((total_passed + module_passed))
        total_failed=$((total_failed + module_failures))
        total_errors=$((total_errors + module_errors))
        
        # Show module summary
        if [ "$module_total" -gt 0 ]; then
            module_success=$((module_passed * 100 / module_total))
            echo "📋 $module: $module_passed/$module_total passed ($module_success%) | failures: $module_failures | errors: $module_errors"
        else
            echo "📋 $module: No tests found"
        fi
    done
    
    # Set final output for summary calculation
    output="Ran $total_tests tests"
    if [ "$total_failed" -gt 0 ]; then
        output="$output with failures=$total_failed"
    fi
    if [ "$total_errors" -gt 0 ]; then
        output="$output errors=$total_errors"
    fi
    
else
    MODULE="$1"
    echo "🎯 Running tests for: $MODULE"
    echo "=========================================="
    output=$(docker compose exec -T server python manage.py test "$MODULE" $TEST_OPTIONS --verbosity=2 2>&1 | tee /dev/stderr)
fi

echo ""
echo "=========================================="

# Extract statistics from test output
if [[ "$1" == "" ]] || [[ "$1" == "--fresh-db" ]]; then
    # Use pre-calculated totals from module runs
    total=$total_tests
    failures=$total_failed
    errors=$total_errors
    passed=$total_passed
else
    # Extract from single module output
    total=$(echo "$output" | grep -o "Ran [0-9]* test" | grep -o "[0-9]*" | head -1)
    failures=$(echo "$output" | grep -o "failures=[0-9]*" | grep -o "[0-9]*" | head -1)
    errors=$(echo "$output" | grep -o "errors=[0-9]*" | grep -o "[0-9]*" | head -1)
    
    # Set defaults if empty
    total=${total:-0}
    failures=${failures:-0}
    errors=${errors:-0}
    
    # Calculate passed tests
    passed=$((total - failures - errors))
fi
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