#!/usr/bin/env node
/**
 * BGE-M3 Theme Ingestion Script
 * Generates 1024D embeddings for all themes using BGE-M3 model
 * 
 * Usage:
 *   npm run ingest-themes-bge
 *   # or
 *   npx tsx src/scripts/ingest-themes-bge-m3.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { bgeEmbeddingsService } from '../services/embeddings-bge.service.js';

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Need service role for admin operations

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

interface Theme {
  code: string;
  label: string;
  description: string;
}

interface ThemeWithEmbedding extends Theme {
  embedding?: number[];
  sparse_embedding?: any;
  combined_text: string;
}

class ThemeBgeIngestion {
  private supabase;
  private bgeService;
  private batchSize = 20;
  private retryAttempts = 3;

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    this.bgeService = bgeEmbeddingsService;
  }

  async run() {
    console.log('🚀 Starting BGE-M3 theme ingestion...\n');

    try {
      // 1. Verify migration was completed
      await this.verifyMigration();

      // 2. Load themes from JSON file
      const themes = await this.loadThemes();
      console.log(`📚 Loaded ${themes.length} themes from themes.json`);

      // 3. Setup progress tracking
      await this.setupProgressTracking(themes);

      // 4. Get themes that need embeddings
      const themesToProcess = await this.getThemesForProcessing();
      console.log(`🔄 ${themesToProcess.length} themes need BGE-M3 embeddings`);

      if (themesToProcess.length === 0) {
        console.log('✅ All themes already have embeddings!');
        await this.createIndexes();
        return;
      }

      // 5. Process themes in batches
      await this.processThemesInBatches(themesToProcess);

      // 6. Create IVFFLAT indexes
      await this.createIndexes();

      // 7. Verify completion
      await this.verifyCompletion();

      console.log('\n🎉 BGE-M3 theme ingestion completed successfully!');

    } catch (error) {
      console.error('\n❌ Ingestion failed:', error);
      process.exit(1);
    }
  }

  private async verifyMigration() {
    console.log('🔍 Verifying migration...');

    // Check if themes table has the new structure
    const { data, error } = await this.supabase
      .from('themes')
      .select('code, embedding')
      .limit(1)
      .single();

    if (error && !error.message.includes('No rows')) {
      throw new Error(`Migration verification failed: ${error.message}`);
    }

    console.log('✅ Migration verified - themes table ready for BGE-M3');
  }

  private async loadThemes(): Promise<Theme[]> {
    // Try to load from themes.json first
    const jsonPath = path.join(process.cwd(), 'supabase/scripts/themes.json');
    
    if (fs.existsSync(jsonPath)) {
      const content = fs.readFileSync(jsonPath, 'utf-8');
      const data = JSON.parse(content);
      return data.themes || data; // Handle both {themes: [...]} and [...] formats
    }

    // Fallback: load from TypeScript file (seed-themes.ts)
    console.log('📄 themes.json not found, loading from existing database...');
    
    const { data, error } = await this.supabase
      .from('themes')
      .select('code, label, description')
      .order('code');

    if (error) {
      throw new Error(`Failed to load themes: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('No themes found. Please run seed-themes.ts first.');
    }

    return data;
  }

  private async setupProgressTracking(themes: Theme[]) {
    console.log('📋 Setting up progress tracking...');

    // Initialize tracking for all themes
    for (const theme of themes) {
      const { error } = await this.supabase
        .from('theme_embedding_progress')
        .upsert({
          theme_code: theme.code,
          status: 'pending'
        }, { 
          onConflict: 'theme_code',
          ignoreDuplicates: true 
        });

      if (error && !error.message.includes('already exists')) {
        console.warn(`⚠️ Could not track theme ${theme.code}:`, error.message);
      }
    }

    console.log('✅ Progress tracking initialized');
  }

  private async getThemesForProcessing(): Promise<ThemeWithEmbedding[]> {
    const { data, error } = await this.supabase
      .from('themes')
      .select('code, label, description, embedding')
      .is('embedding', null)
      .order('code');

    if (error) {
      throw new Error(`Failed to get themes for processing: ${error.message}`);
    }

    return (data || []).map(theme => ({
      ...theme,
      combined_text: `${theme.label}. ${theme.description || ''}`
    }));
  }

  private async processThemesInBatches(themes: ThemeWithEmbedding[]) {
    const totalThemes = themes.length;
    let processed = 0;

    console.log(`\n🔄 Processing ${totalThemes} themes in batches of ${this.batchSize}...\n`);

    for (let i = 0; i < themes.length; i += this.batchSize) {
      const batch = themes.slice(i, i + this.batchSize);
      const batchNum = Math.floor(i / this.batchSize) + 1;
      const totalBatches = Math.ceil(themes.length / this.batchSize);

      console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} themes)...`);

      // Generate embeddings for batch
      const embeddings = await this.generateEmbeddingsBatch(batch);

      // Update database
      const results = await this.updateDatabase(embeddings);

      // Count successes
      const successful = results.filter(r => r.success).length;
      processed += successful;

      console.log(`   ✅ ${successful}/${batch.length} themes completed`);
      console.log(`   📊 Overall progress: ${processed}/${totalThemes} (${Math.round(processed/totalThemes*100)}%)\n`);

      // Small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  private async generateEmbeddingsBatch(themes: ThemeWithEmbedding[]): Promise<ThemeWithEmbedding[]> {
    const results: ThemeWithEmbedding[] = [];

    for (const theme of themes) {
      try {
        console.log(`   🧠 Generating embedding for: ${theme.code}`);

        // Update progress to 'processing'
        await this.updateProgress(theme.code, 'processing');

        // Generate BGE-M3 embedding
        const embedding = await this.bgeService.generateEmbedding(theme.combined_text);

        if (!embedding || embedding.length !== 1024) {
          throw new Error(`Invalid embedding: expected 1024 dimensions, got ${embedding?.length || 0}`);
        }

        // Try to generate sparse embedding (optional)
        let sparseEmbedding = null;
        try {
          const fullEmbedding = await this.bgeService.generateFullEmbedding(theme.combined_text);
          sparseEmbedding = fullEmbedding.sparse ? Object.fromEntries(fullEmbedding.sparse) : null;
        } catch (e) {
          console.log(`      ⚠️  Sparse embedding failed for ${theme.code} (continuing without it)`);
        }

        results.push({
          ...theme,
          embedding,
          sparse_embedding: sparseEmbedding
        });

      } catch (error) {
        console.error(`   ❌ Failed to generate embedding for ${theme.code}:`, error.message);

        // Update progress with error
        await this.updateProgress(theme.code, 'failed', error.message);

        results.push({
          ...theme,
          embedding: undefined
        });
      }
    }

    return results;
  }

  private async updateDatabase(themes: ThemeWithEmbedding[]) {
    const results: Array<{theme_code: string, success: boolean, error?: string}> = [];

    for (const theme of themes) {
      if (!theme.embedding) {
        results.push({
          theme_code: theme.code,
          success: false,
          error: 'No embedding generated'
        });
        continue;
      }

      try {
        // Update theme with new embedding
        const { error } = await this.supabase
          .from('themes')
          .update({
            embedding: theme.embedding,
            sparse_embedding: theme.sparse_embedding,
            embedding_version: 'bge-m3'
          })
          .eq('code', theme.code);

        if (error) {
          throw error;
        }

        // Update progress
        await this.updateProgress(theme.code, 'completed');

        results.push({
          theme_code: theme.code,
          success: true
        });

      } catch (error) {
        console.error(`   ❌ Database update failed for ${theme.code}:`, error.message);

        await this.updateProgress(theme.code, 'failed', error.message);

        results.push({
          theme_code: theme.code,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  private async updateProgress(themeCode: string, status: string, errorMessage?: string) {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'completed') {
      updateData.embedding_generated_at = new Date().toISOString();
    }

    if (errorMessage) {
      updateData.error_message = errorMessage;
      // Increment retry count for failed status
      const { data: current } = await this.supabase
        .from('theme_embedding_progress')
        .select('retry_count')
        .eq('theme_code', themeCode)
        .single();
      
      updateData.retry_count = (current?.retry_count || 0) + 1;
    }

    await this.supabase
      .from('theme_embedding_progress')
      .upsert({
        theme_code: themeCode,
        ...updateData
      }, { onConflict: 'theme_code' });
  }

  private async createIndexes() {
    console.log('\n🔧 Creating IVFFLAT indexes...');
    console.log('ℹ️  For dashboard users: Run the post-bge-ingestion-dashboard.sql script manually');

    try {
      // Get theme count for optimal list size calculation
      const { data: countData } = await this.supabase
        .from('themes')
        .select('code', { count: 'exact', head: true });

      const themeCount = countData?.length || 0;
      const optimalLists = Math.max(10, Math.floor(Math.sqrt(themeCount)));

      console.log(`📊 Found ${themeCount} themes, optimal IVFFLAT lists: ${optimalLists}`);
      console.log('\n📝 Manual index creation SQL:');
      console.log(`
-- Run this in your Supabase SQL editor:
ANALYZE themes;
SET ivfflat.probes = 5;

DROP INDEX IF EXISTS idx_themes_embedding_ivfflat;
CREATE INDEX idx_themes_embedding_ivfflat 
ON themes 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = ${optimalLists});
      `);

    } catch (error) {
      console.error('❌ Index creation guidance failed:', error);
    }
  }

  private async verifyCompletion() {
    console.log('\n🔍 Verifying completion...');

    const { data, error } = await this.supabase.rpc('execute_sql', {
      sql: `
        SELECT 
          COUNT(*) as total_themes,
          COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as with_embeddings,
          COUNT(CASE WHEN embedding IS NULL THEN 1 END) as missing_embeddings,
          ROUND(
            COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 2
          ) as percent_complete
        FROM themes;
      `
    });

    if (error) {
      console.error('❌ Verification failed:', error);
      return;
    }

    const stats = data?.[0];
    if (stats) {
      console.log(`📊 Final Statistics:`);
      console.log(`   Total themes: ${stats.total_themes}`);
      console.log(`   With embeddings: ${stats.with_embeddings}`);
      console.log(`   Missing embeddings: ${stats.missing_embeddings}`);
      console.log(`   Completion: ${stats.percent_complete}%`);

      if (stats.missing_embeddings > 0) {
        console.log('\n⚠️  Some themes are missing embeddings. Check the logs above for errors.');
      }
    }
  }

  // Retry failed embeddings
  async retryFailed() {
    console.log('🔄 Retrying failed theme embeddings...');

    const { data: failed } = await this.supabase
      .from('theme_embedding_progress')
      .select('theme_code')
      .eq('status', 'failed')
      .lt('retry_count', this.retryAttempts);

    if (!failed || failed.length === 0) {
      console.log('✅ No failed themes to retry');
      return;
    }

    console.log(`🔄 Retrying ${failed.length} failed themes...`);

    // Reset status to pending for retry
    for (const item of failed) {
      await this.updateProgress(item.theme_code, 'pending');
    }

    // Get themes for processing again
    const themesToRetry = await this.getThemesForProcessing();
    
    if (themesToRetry.length > 0) {
      await this.processThemesInBatches(themesToRetry);
    }
  }

  // Show current progress
  async showProgress() {
    const { data } = await this.supabase.rpc('execute_sql', {
      sql: `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as completed,
          COUNT(CASE WHEN embedding IS NULL THEN 1 END) as remaining,
          ROUND(COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 1) as percent
        FROM themes;
      `
    });

    if (data?.[0]) {
      const { total, completed, remaining, percent } = data[0];
      console.log(`📊 Progress: ${completed}/${total} themes (${percent}%) - ${remaining} remaining`);
    }

    // Show failed themes
    const { data: failed } = await this.supabase
      .from('theme_embedding_progress')
      .select('theme_code, error_message, retry_count')
      .eq('status', 'failed');

    if (failed && failed.length > 0) {
      console.log(`\n❌ Failed themes (${failed.length}):`);
      failed.forEach(f => {
        console.log(`   ${f.theme_code}: ${f.error_message} (attempts: ${f.retry_count})`);
      });
    }
  }
}

// CLI interface
async function main() {
  const command = process.argv[2] || 'ingest';
  const ingestion = new ThemeBgeIngestion();

  switch (command) {
    case 'ingest':
      await ingestion.run();
      break;
    case 'retry':
      await ingestion.retryFailed();
      break;
    case 'progress':
      await ingestion.showProgress();
      break;
    case 'help':
      console.log(`
Usage: npx tsx src/scripts/ingest-themes-bge-m3.ts [command]

Commands:
  ingest     Run full BGE-M3 embedding generation (default)
  retry      Retry failed embeddings
  progress   Show current progress
  help       Show this help

Environment variables required:
  SUPABASE_URL              Your Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY Your Supabase service role key
      `);
      break;
    default:
      console.log('Unknown command. Use "help" for usage information.');
      process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { ThemeBgeIngestion };