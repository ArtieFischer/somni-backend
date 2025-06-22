# Node.js BGE-M3 Ingestion Example

This document shows how to integrate the SQL ingestion scripts with your Node.js backend to generate BGE-M3 embeddings for themes.

## 1. Install Dependencies

```bash
npm install @xenova/transformers
# or if using your existing BGE service
```

## 2. Node.js Ingestion Script

```javascript
// File: src/scripts/ingest-themes-bge.js

import { SupabaseService } from '../services/supabase.service.js';
import { EmbeddingsBgeService } from '../services/embeddings-bge.service.js';

class ThemeBgeIngestion {
    constructor() {
        this.supabase = new SupabaseService();
        this.bgeService = new EmbeddingsBgeService();
        this.batchSize = 20; // Process 20 themes at a time
    }

    async ingestAllThemes() {
        console.log('Starting BGE-M3 theme ingestion...');
        
        try {
            // 1. Setup ingestion tracking
            await this.setupIngestion();
            
            let hasMore = true;
            let totalProcessed = 0;
            
            while (hasMore) {
                // 2. Get next batch of themes
                const themes = await this.getThemesForProcessing();
                
                if (themes.length === 0) {
                    hasMore = false;
                    console.log('No more themes to process');
                    break;
                }
                
                console.log(`Processing batch of ${themes.length} themes...`);
                
                // 3. Generate embeddings for batch
                const embeddings = await this.generateEmbeddingsBatch(themes);
                
                // 4. Update database
                const results = await this.updateThemeEmbeddings(embeddings);
                
                // 5. Report progress
                const successful = results.filter(r => r.success).length;
                totalProcessed += successful;
                
                console.log(`Batch complete: ${successful}/${themes.length} successful`);
                
                // 6. Show overall progress
                await this.showProgress();
                
                // Small delay to prevent overwhelming the system
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            console.log(`\n✅ Ingestion complete! Processed ${totalProcessed} themes total`);
            
            // 7. Create indexes
            await this.createIndexes();
            
        } catch (error) {
            console.error('❌ Ingestion failed:', error);
            throw error;
        }
    }

    async setupIngestion() {
        // Run the ingestion setup SQL
        const { error } = await this.supabase.client.rpc('execute_sql', {
            sql: `
                -- Initialize ingestion progress tracking
                INSERT INTO theme_embedding_progress (theme_code, status)
                SELECT code, 'pending'
                FROM themes
                WHERE code NOT IN (
                    SELECT theme_code FROM theme_embedding_progress 
                    WHERE theme_code IS NOT NULL
                )
                ON CONFLICT DO NOTHING;
            `
        });
        
        if (error) throw error;
        console.log('✅ Ingestion tracking initialized');
    }

    async getThemesForProcessing() {
        const { data, error } = await this.supabase.client
            .rpc('get_themes_for_processing', { p_batch_size: this.batchSize });
        
        if (error) throw error;
        return data || [];
    }

    async generateEmbeddingsBatch(themes) {
        const embeddings = [];
        
        for (const theme of themes) {
            try {
                console.log(`Generating embedding for: ${theme.code}`);
                
                // Generate dense embedding using BGE-M3
                const denseEmbedding = await this.bgeService.generateEmbedding(
                    theme.combined_text
                );
                
                // Generate sparse embedding (if your BGE service supports it)
                let sparseEmbedding = null;
                try {
                    sparseEmbedding = await this.bgeService.generateSparseEmbedding(
                        theme.combined_text
                    );
                } catch (e) {
                    console.warn(`Sparse embedding failed for ${theme.code}:`, e.message);
                }
                
                embeddings.push({
                    code: theme.code,
                    embedding: denseEmbedding,
                    sparse_embedding: sparseEmbedding
                });
                
            } catch (error) {
                console.error(`Failed to generate embedding for ${theme.code}:`, error);
                embeddings.push({
                    code: theme.code,
                    embedding: null,
                    error: error.message
                });
            }
        }
        
        return embeddings;
    }

    async updateThemeEmbeddings(embeddings) {
        // Filter out failed embeddings
        const validEmbeddings = embeddings.filter(e => e.embedding && e.embedding.length === 1024);
        
        if (validEmbeddings.length === 0) {
            console.warn('No valid embeddings to update');
            return [];
        }
        
        // Use batch update function
        const { data, error } = await this.supabase.client
            .rpc('batch_update_theme_embeddings', {
                p_theme_data: validEmbeddings
            });
        
        if (error) {
            console.error('Batch update failed:', error);
            // Fallback to individual updates
            return await this.updateThemesIndividually(validEmbeddings);
        }
        
        return data || [];
    }

    async updateThemesIndividually(embeddings) {
        const results = [];
        
        for (const emb of embeddings) {
            try {
                const { data, error } = await this.supabase.client
                    .rpc('update_theme_embedding', {
                        p_theme_code: emb.code,
                        p_embedding_vector: emb.embedding,
                        p_sparse_embedding: emb.sparse_embedding
                    });
                
                results.push({
                    theme_code: emb.code,
                    success: !error,
                    error_message: error?.message || null
                });
                
            } catch (error) {
                results.push({
                    theme_code: emb.code,
                    success: false,
                    error_message: error.message
                });
            }
        }
        
        return results;
    }

    async showProgress() {
        const { data } = await this.supabase.client
            .from('theme_ingestion_progress')
            .select('*')
            .limit(1);
        
        // Get summary
        const { data: summary } = await this.supabase.client.rpc('execute_sql', {
            sql: `
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as completed,
                    ROUND(COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 1) as percent
                FROM themes;
            `
        });
        
        if (summary?.[0]) {
            const { total, completed, percent } = summary[0];
            console.log(`Progress: ${completed}/${total} themes (${percent}%)`);
        }
    }

    async createIndexes() {
        console.log('Creating IVFFLAT indexes...');
        
        const { error } = await this.supabase.client.rpc('execute_sql', {
            sql: `
                -- Run post-ingestion setup
                ANALYZE themes;
                SELECT create_themes_ivfflat_index();
                SET ivfflat.probes = 5;
            `
        });
        
        if (error) {
            console.error('Index creation failed:', error);
        } else {
            console.log('✅ IVFFLAT indexes created successfully');
        }
    }

    // Retry failed embeddings
    async retryFailed() {
        console.log('Retrying failed theme embeddings...');
        
        const { data: failed } = await this.supabase.client
            .from('theme_embedding_progress')
            .select('theme_code')
            .eq('status', 'failed')
            .lt('retry_count', 3);
        
        if (!failed || failed.length === 0) {
            console.log('No failed themes to retry');
            return;
        }
        
        console.log(`Retrying ${failed.length} failed themes...`);
        
        // Reset status to pending for retry
        await this.supabase.client
            .from('theme_embedding_progress')
            .update({ status: 'pending' })
            .in('theme_code', failed.map(f => f.theme_code));
        
        // Run ingestion again
        await this.ingestAllThemes();
    }
}

// CLI usage
async function main() {
    const command = process.argv[2] || 'ingest';
    const ingestion = new ThemeBgeIngestion();
    
    switch (command) {
        case 'ingest':
            await ingestion.ingestAllThemes();
            break;
        case 'retry':
            await ingestion.retryFailed();
            break;
        case 'progress':
            await ingestion.showProgress();
            break;
        default:
            console.log('Usage: node ingest-themes-bge.js [ingest|retry|progress]');
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export { ThemeBgeIngestion };
```

## 3. Usage Examples

```bash
# Run full ingestion
node src/scripts/ingest-themes-bge.js ingest

# Retry failed embeddings  
node src/scripts/ingest-themes-bge.js retry

# Check progress
node src/scripts/ingest-themes-bge.js progress
```

## 4. SQL Integration Points

The Node.js script integrates with these SQL functions:

```sql
-- Get themes to process
SELECT * FROM get_themes_for_processing(20);

-- Update single theme
SELECT update_theme_embedding('flying', ARRAY[0.1, 0.2, ...], '{}');

-- Batch update themes
SELECT * FROM batch_update_theme_embeddings('[...]');

-- Check progress
SELECT * FROM theme_ingestion_progress;
```

## 5. Monitoring Queries

```sql
-- Current progress
SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as completed,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
FROM themes t
LEFT JOIN theme_embedding_progress p ON t.code = p.theme_code;

-- Failed themes
SELECT code, error_message, retry_count 
FROM theme_ingestion_progress 
WHERE status = 'failed';

-- Recent completions
SELECT theme_code, embedding_generated_at
FROM theme_embedding_progress
WHERE status = 'completed'
ORDER BY embedding_generated_at DESC
LIMIT 10;
```

This provides a complete pipeline from SQL setup → Node.js embedding generation → database ingestion → index creation.