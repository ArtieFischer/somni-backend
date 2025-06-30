#!/bin/bash
# Reset Supabase database to clean state
# WARNING: This will DELETE ALL DATA in the database

set -e

echo "⚠️  WARNING: This will delete all data in your database!"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
MIGRATIONS_DIR="$SCRIPT_DIR/../migrations"

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   brew install supabase/tap/supabase"
    exit 1
fi

echo "🔄 Resetting database..."

# Reset the database
supabase db reset

echo "✅ Database reset complete!"
echo ""
echo "Next steps:"
echo "1. Run migrations: supabase db push"
echo "2. Generate types: npm run generate-types"
echo "3. Seed themes: Run your embedding generation script"