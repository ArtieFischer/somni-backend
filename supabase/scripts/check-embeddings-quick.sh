#!/bin/bash

echo "Quick check: Do themes have embeddings?"
echo ""

# Query the themes table to check embedding status
curl -X GET "https://tqwlnrlvtdsqgqpuryne.supabase.co/rest/v1/themes?select=code,label&embedding=not.is.null&limit=5" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxd2xucmx2dGRzcWdxcHVyeW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMTIzMDksImV4cCI6MjA2NDc4ODMwOX0.h7Kc-NREKkRNPsXcwClUAtQ7pDbu2BFym231q3gT5jQ" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxd2xucmx2dGRzcWdxcHVyeW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMTIzMDksImV4cCI6MjA2NDc4ODMwOX0.h7Kc-NREKkRNPsXcwClUAtQ7pDbu2BFym231q3gT5jQ" | jq '.'

echo -e "\n\nIf you see theme codes and labels above, embeddings are stored!"