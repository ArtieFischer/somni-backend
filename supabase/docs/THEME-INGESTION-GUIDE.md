# Theme BGE-M3 Ingestion Guide

This guide shows how to ingest your existing themes with BGE-M3 embeddings.

## Prerequisites

1. ✅ **Migration completed**: Run the migration first
2. ✅ **BGE-M3 service**: Your `EmbeddingsBgeService` should be working
3. ✅ **Environment variables**: Set up Supabase credentials

## Step-by-Step Process

### 1. Run the Migration

```bash
# Apply the migration to update themes table structure
supabase db reset
# or
psql -f supabase/migrations/20240101000002_clean_and_prepare_bge.sql
```

### 2. Setup Ingestion Infrastructure

```bash
# Run the ingestion setup (creates tracking tables and functions)
psql -f supabase/scripts/ingest-themes-bge.sql
```

### 3. Run the Actual Ingestion

```bash
# Set environment variables
export SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run the ingestion script
npm run ingest-themes-bge

# Alternative commands:
npm run ingest-themes-bge retry    # Retry failed embeddings
npm run ingest-themes-bge progress # Check progress
```

### 4. Create Indexes (Post-Ingestion)

```bash
# After all embeddings are generated, create the IVFFLAT index
psql -f supabase/scripts/post-bge-ingestion.sql
```

### 5. Test the Results

```bash
# Test symbol search functionality
psql -f supabase/scripts/test-theme-symbol-search.sql
```

## What the Ingestion Script Does

The `ingest-themes-bge-m3.ts` script:

1. **Loads themes** from your `themes.json` or existing database
2. **Processes in batches** of 20 themes at a time
3. **Generates 1024D embeddings** using your BGE-M3 service
4. **Updates the database** with new embeddings
5. **Tracks progress** with retry logic for failures
6. **Creates IVFFLAT indexes** for optimal search performance

## Example Output

```
🚀 Starting BGE-M3 theme ingestion...

📚 Loaded 760 themes from themes.json
🔄 760 themes need BGE-M3 embeddings

📦 Processing batch 1/38 (20 themes)...
   🧠 Generating embedding for: falling
   🧠 Generating embedding for: flying
   ...
   ✅ 20/20 themes completed
   📊 Overall progress: 20/760 (3%)

...

🔧 Creating IVFFLAT indexes...
✅ IVFFLAT index created successfully

📊 Final Statistics:
   Total themes: 760
   With embeddings: 760
   Missing embeddings: 0
   Completion: 100%

🎉 BGE-M3 theme ingestion completed successfully!
```

## Data Sources

The script automatically detects and loads themes from:

1. **Primary**: `supabase/scripts/themes.json` (your JSON file)
2. **Fallback**: Existing themes in the database
3. **Format**: Supports both `{themes: [...]}` and `[...]` JSON formats

## Monitoring Progress

```bash
# Check progress anytime
npm run ingest-themes-bge progress

# View in database
psql -c "SELECT status, COUNT(*) FROM theme_embedding_progress GROUP BY status;"
```

## Error Handling

- ⚠️ **Failed embeddings**: Automatically retried up to 3 times
- 📝 **Progress tracking**: Each theme's status is saved
- 🔄 **Resume capability**: Can restart without losing progress
- 🛡️ **Validation**: Checks embedding dimensions (must be 1024D)

## Troubleshooting

### "No themes found" Error
```bash
# First seed your themes (if not already done)
npx tsx supabase/scripts/seed-themes.ts
```

### "Invalid embedding dimensions" Error
- Check your BGE-M3 service is returning 1024D vectors
- Verify the service is using the correct model

### "Migration not complete" Error
```bash
# Run the migration first
psql -f supabase/migrations/20240101000002_clean_and_prepare_bge.sql
```

### Slow Performance
- Reduce batch size in the script (change `batchSize = 20` to smaller number)
- Check your BGE-M3 service performance
- Ensure adequate memory allocation

## Files Involved

- **Migration**: `supabase/migrations/20240101000002_clean_and_prepare_bge.sql`
- **Ingestion Setup**: `supabase/scripts/ingest-themes-bge.sql`
- **Main Script**: `src/scripts/ingest-themes-bge-m3.ts`
- **Data Source**: `supabase/scripts/themes.json`
- **Post-Processing**: `supabase/scripts/post-bge-ingestion.sql`
- **Testing**: `supabase/scripts/test-theme-symbol-search.sql`

Ready to start? Run: `npm run ingest-themes-bge` 🚀