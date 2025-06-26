#!/bin/bash

# Script simple pour lancer les tests avec statistiques
# Usage: ./test_with_stats.sh [module_name] [--keepdb]

echo "🧪 Running Django Tests with Statistics"
echo "========================================"

# Vérifier que Docker est lancé
if ! docker compose ps server | grep -q "Up"; then
    echo "❌ Error: Docker containers are not running!"
    echo "Please run 'make up' first to start the containers."
    exit 1
fi

# Préparer les options de test (--keepdb par défaut pour la vitesse)
TEST_OPTIONS="--verbosity=1 --keepdb"
if [[ "$*" == *"--fresh-db"* ]]; then
    TEST_OPTIONS="--verbosity=1"
    echo "🔄 Using fresh database (slower)"
else
    echo "🚀 Using --keepdb for faster execution"
fi

# Fonction pour afficher les étapes de progression
show_progress() {
    echo "🔄 Step 1/4: Connecting to Django container..."
    sleep 1
    echo "🔄 Step 2/4: Setting up test environment..."
    sleep 1
    echo "🔄 Step 3/4: Creating test database and applying migrations..."
    sleep 1
    echo "🔄 Step 4/4: Running tests and collecting results..."
    echo ""
}

# Lancer les tests avec suivi en temps réel
if [ -z "$1" ] || [ "$1" = "--keepdb" ]; then
    echo "🎯 Running ALL tests..."
    show_progress
    echo "🔄 Running tests with real-time feedback..."
    echo "=========================================="
    docker compose exec -T server python manage.py test $TEST_OPTIONS --verbosity=2 | tee /tmp/test_output.txt
    output=$(cat /tmp/test_output.txt)
else
    MODULE="$1"
    echo "🎯 Running tests for: $MODULE"
    show_progress
    echo "🔄 Running tests with real-time feedback..."
    echo "=========================================="
    docker compose exec -T server python manage.py test "$MODULE" $TEST_OPTIONS --verbosity=2 | tee /tmp/test_output.txt
    output=$(cat /tmp/test_output.txt)
fi

echo ""
echo "=========================================="

# Extraire les statistiques
total=$(echo "$output" | grep -o "Ran [0-9]* test" | grep -o "[0-9]*")
failures=$(echo "$output" | grep -o "failures=[0-9]*" | grep -o "[0-9]*")
errors=$(echo "$output" | grep -o "errors=[0-9]*" | grep -o "[0-9]*")

# Valeurs par défaut si vides
total=${total:-0}
failures=${failures:-0}
errors=${errors:-0}

# Calculs
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

# Affichage du résumé
echo ""
echo "📊 SUMMARY"
echo "=========="
echo "Total tests: $total"
echo "✅ Passed: $passed ($passed_pct%)"
echo "❌ Failed: $failures ($failed_pct%)" 
echo "💥 Errors: $errors ($errors_pct%)"
echo "🎯 Success rate: $success_pct%"

# Status
if [ "$success_pct" -ge 90 ]; then
    echo "🟢 Status: EXCELLENT"
elif [ "$success_pct" -ge 70 ]; then
    echo "🟡 Status: GOOD"
else
    echo "🔴 Status: NEEDS WORK"
fi

echo "========================================"