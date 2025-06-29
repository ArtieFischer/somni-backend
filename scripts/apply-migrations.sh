#!/bin/bash

# Apply missing migrations to Supabase

echo "Applying missing migrations..."

# Check if npx supabase is available
if ! command -v npx &> /dev/null; then
    echo "npx command not found. Please install Node.js and npm."
    exit 1
fi

# Apply migrations
echo "Applying shared_dreams migration..."
npx supabase db push --file ./supabase/migrations/20250629_shared_dreams.sql

echo "Migrations applied successfully!"