#!/bin/bash

echo "Testing theme search functionality..."

# Test the search_themes RPC function
curl -X POST https://tqwlnrlvtdsqgqpuryne.supabase.co/rest/v1/rpc/search_themes \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxd2xucmx2dGRzcWdxcHVyeW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMTIzMDksImV4cCI6MjA2NDc4ODMwOX0.h7Kc-NREKkRNPsXcwClUAtQ7pDbu2BFym231q3gT5jQ" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxd2xucmx2dGRzcWdxcHVyeW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMTIzMDksImV4cCI6MjA2NDc4ODMwOX0.h7Kc-NREKkRNPsXcwClUAtQ7pDbu2BFym231q3gT5jQ" \
  -d '{
    "query_embedding": [0.1, 0.2, 0.3],
    "similarity_threshold": 0.0,
    "max_results": 5
  }' | jq '.'

echo -e "\n\nIf you see an error about query_embedding dimension, it means embeddings are stored!"
echo "The error would confirm that embeddings exist but have different dimensions than our test vector."