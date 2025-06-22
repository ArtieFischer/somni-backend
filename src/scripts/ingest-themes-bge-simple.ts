#!/usr/bin/env node
/**
 * Simple BGE-M3 Theme Ingestion Script
 * Just updates themes with 1024D embeddings - no tracking tables needed
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { bgeEmbeddingsService } from '../services/embeddings-bge.service.js';

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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

class SimpleThemeIngestion {
  private supabase;
  private bgeService;

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    this.bgeService = bgeEmbeddingsService;
  }

  async run() {
    console.log('🚀 Starting simple BGE-M3 theme ingestion...\n');

    try {
      // 1. Load themes
      const themes = await this.loadThemes();
      console.log(`📚 Loaded ${themes.length} themes`);

      // 2. Get themes that need embeddings
      const themesToProcess = await this.getThemesWithoutEmbeddings();
      console.log(`🔄 ${themesToProcess.length} themes need BGE-M3 embeddings`);

      if (themesToProcess.length === 0) {
        console.log('✅ All themes already have embeddings!');
        return;
      }

      // 3. Process all themes
      let processed = 0;
      for (const theme of themesToProcess) {
        try {
          console.log(`🧠 Processing: ${theme.code} (${processed + 1}/${themesToProcess.length})`);
          
          // Generate embedding
          const combinedText = `${theme.label}. ${theme.description || ''}`;
          const embedding = await this.bgeService.generateEmbedding(combinedText);

          if (!embedding || embedding.length !== 1024) {
            throw new Error(`Invalid embedding: expected 1024 dimensions, got ${embedding?.length || 0}`);
          }

          // Update theme in database
          const { error } = await this.supabase
            .from('themes')
            .update({
              embedding: embedding,
              embedding_version: 'bge-m3'
            })
            .eq('code', theme.code);

          if (error) {
            throw error;
          }

          processed++;
          console.log(`   ✅ Updated ${theme.code}`);

        } catch (error) {
          console.error(`   ❌ Failed ${theme.code}:`, error.message);
        }

        // Small delay to prevent overwhelming the system
        if (processed % 10 === 0) {
          console.log(`📊 Progress: ${processed}/${themesToProcess.length} (${Math.round(processed/themesToProcess.length*100)}%)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log(`\n🎉 Completed! Successfully processed ${processed}/${themesToProcess.length} themes`);

      // 4. Create IVFFLAT index
      await this.createIndex();

      // 5. Show final stats
      await this.showStats();

    } catch (error) {
      console.error('\n❌ Ingestion failed:', error);
      process.exit(1);
    }
  }

  private async loadThemes(): Promise<Theme[]> {
    // Try to load from themes.json first
    const jsonPath = path.join(process.cwd(), 'supabase/scripts/themes.json');
    
    if (fs.existsSync(jsonPath)) {
      const content = fs.readFileSync(jsonPath, 'utf-8');
      const data = JSON.parse(content);
      return data.themes || data;
    }

    // Fallback: load from database
    const { data, error } = await this.supabase
      .from('themes')
      .select('code, label, description')
      .order('code');

    if (error) {
      throw new Error(`Failed to load themes: ${error.message}`);
    }

    return data || [];
  }

  private async getThemesWithoutEmbeddings(): Promise<Theme[]> {
    const { data, error } = await this.supabase
      .from('themes')
      .select('code, label, description')
      .is('embedding', null)
      .order('code');

    if (error) {
      throw new Error(`Failed to get themes: ${error.message}`);
    }

    return data || [];
  }

  private async createIndex() {
    console.log('\n🔧 Creating IVFFLAT index...');

    try {
      // Get theme count for optimal list calculation
      const { data } = await this.supabase
        .from('themes')
        .select('code')
        .not('embedding', 'is', null);

      const themeCount = data?.length || 0;
      
      if (themeCount >= 50) {
        // Use fewer lists to fit within Supabase's 32MB maintenance_work_mem limit
        const lists = Math.min(10, Math.max(5, Math.floor(Math.sqrt(themeCount) / 3)));
        
        console.log(`📊 Creating IVFFLAT index for ${themeCount} themes with lists=${lists} (memory optimized)`);

        // Drop old index and create IVFFLAT
        await this.supabase.rpc('execute_sql', {
          sql: `
            DROP INDEX IF EXISTS idx_themes_embedding;
            DROP INDEX IF EXISTS idx_themes_embedding_ivfflat;
            
            ANALYZE themes;
            
            CREATE INDEX idx_themes_embedding_ivfflat 
            ON themes 
            USING ivfflat (embedding vector_cosine_ops) 
            WITH (lists = ${lists});
            
            SET ivfflat.probes = 5;
          `
        });

        console.log('✅ IVFFLAT index created successfully');
      } else {
        console.log(`⚠️  Only ${themeCount} themes with embeddings, using HNSW instead`);
        
        await this.supabase.rpc('execute_sql', {
          sql: `
            CREATE INDEX IF NOT EXISTS idx_themes_embedding_hnsw 
            ON themes 
            USING hnsw (embedding vector_cosine_ops)
            WITH (m = 16, ef_construction = 64);
          `
        });
      }

    } catch (error) {
      console.error('❌ Index creation failed:', error.message);
      console.log('ℹ️  You can create the index manually in the dashboard later');
    }
  }

  private async showStats() {
    const { data, error } = await this.supabase
      .from('themes')
      .select('code, embedding')
      .order('code');

    if (error) {
      console.error('Failed to get final stats:', error);
      return;
    }

    const total = data?.length || 0;
    const withEmbeddings = data?.filter(t => t.embedding).length || 0;
    const missing = total - withEmbeddings;

    console.log(`\n📊 Final Statistics:`);
    console.log(`   Total themes: ${total}`);
    console.log(`   With BGE-M3 embeddings: ${withEmbeddings}`);
    console.log(`   Missing embeddings: ${missing}`);
    console.log(`   Completion: ${Math.round(withEmbeddings/total*100)}%`);
  }
}

// CLI interface
async function main() {
  const ingestion = new SimpleThemeIngestion();
  await ingestion.run();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { SimpleThemeIngestion };