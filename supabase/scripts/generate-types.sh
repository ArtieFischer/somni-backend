#!/bin/bash
# Generate TypeScript types from Supabase schema

set -e

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
TYPES_DIR="$SCRIPT_DIR/../types"

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   brew install supabase/tap/supabase"
    exit 1
fi

echo "🔄 Generating TypeScript types..."

# Generate types
supabase gen types typescript --local > "$TYPES_DIR/database.types.ts"

echo "✅ Types generated successfully!"
echo "📁 Output: $TYPES_DIR/database.types.ts"