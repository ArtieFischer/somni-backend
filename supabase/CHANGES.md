# Supabase Database Restructure - Summary of Changes

## What We've Done

### 1. **Complete Database Redesign**
- Created a comprehensive schema from scratch in `migrations/000_initial_schema.sql`
- Moved from incremental patches to a single, clean schema
- All Supabase files now centralized in `/supabase` directory

### 2. **New Tables Added**
- **profiles** - Enhanced user profiles with location tracking
- **dreams** - Core dream data with 384-dim embeddings
- **dream_images** - Separate table for multiple images per dream
- **themes** - Pre-defined dream themes with embeddings
- **dream_themes** - Many-to-many dream-theme associations
- **interpretations** - Structured interpretation storage
- **conversations** & **messages** - For future chat features
- **knowledge_base** - RAG system (already existed, now integrated)

### 3. **Key Feature Additions**
- **Location Tracking**: PostGIS geography type for heatmap features
- **Privacy Controls**: Location accuracy levels (none/country/city/exact)
- **MiniLM Embeddings**: 384-dimensional vectors (no API costs)
- **Real-time**: Enabled on dreams and dream_images tables
- **Theme Detection**: Automatic theme extraction via embeddings

### 4. **Edge Functions Created**
- `embed-dream/` - Generates embeddings and extracts themes
- `embed-themes/` - Batch processes theme embeddings
- Both use xenova/transformers (MiniLM) for free, local embeddings

### 5. **TypeScript Types**
- Complete type definitions in `types/database.types.ts`
- Covers all tables, enums, and edge function interfaces

### 6. **Documentation**
- `docs/complete-database-architecture.md` - Full schema documentation
- `docs/migration-guide.md` - Step-by-step migration instructions
- `scripts/seed-themes.ts` - Example script to populate themes

## Key Differences from Old Schema

| Old | New |
|-----|-----|
| users_profile table | profiles table |
| Mixed user data | Separated concerns |
| 1536-dim OpenAI embeddings | 384-dim MiniLM embeddings |
| Text-based enums | PostgreSQL native enums |
| Images in dreams table | Separate dream_images table |
| Themes in code | themes & dream_themes tables |
| No location support | Full PostGIS location tracking |

## Next Steps

1. **Drop old schema**: `DROP SCHEMA public CASCADE;`
2. **Run new migration**: Execute `000_initial_schema.sql`
3. **Deploy edge functions**: `supabase functions deploy`
4. **Seed themes**: Run `scripts/seed-themes.ts`
5. **Update application code**: Use new table names and types

## Files to Delete

From `src/scripts/sql/`:
- All SQL files (now obsolete)

## Benefits

1. **Cost Savings**: No OpenAI API costs for embeddings
2. **Privacy**: Location data with user control
3. **Scalability**: Proper table structure for growth
4. **Features**: Ready for heatmaps, chat, multiple images
5. **Performance**: Optimized indexes and vector search