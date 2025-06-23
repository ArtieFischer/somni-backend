# 384D Embeddings Cleanup Report
Generated: 2025-06-22T09:29:20.676Z

## Deleted Files
- supabase/functions/embed-themes
- test-local-embeddings.ts
- supabase/scripts/test-theme-similarity.ts
- supabase/scripts/seed-themes.ts
- supabase/scripts/seed-themes-admin.ts
- supabase/scripts/check-theme-embeddings.sql
- supabase/scripts/verify-embeddings.sql
- supabase/migrations/004_create_update_theme_embedding_function.sql

## Archived Files
- src/services/embeddings.service.ts -> archive/384d-embeddings/embeddings.service.ts
- CLEANUP_384_EMBEDDINGS.md -> archive/384d-embeddings/CLEANUP_384_EMBEDDINGS.md

## Files Requiring Manual Review
- src/services/rag.service.ts
  - Uses embeddingsService - may need to switch to bgeEmbeddingsService for themes
- src/services/hybrid-rag.service.ts
  - Check if theme embeddings are used here
- src/routes/embeddings.ts
  - Review endpoints for theme embedding generation
- supabase/types/database.types.ts
  - Regenerate after migration: npm run supabase:types

## Next Steps
1. Run database migration: `supabase/migrations/20240101000002_clean_and_prepare_bge.sql`
2. Regenerate types: `npm run supabase:types`
3. Review and update the files listed above
4. Test the BGE-M3 theme embeddings with the test script
