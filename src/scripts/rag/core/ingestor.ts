import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../../../config';
import { logger } from '../../../utils/logger';

export interface ProcessedChunk {
  interpreter_type: string;
  source: string;
  chapter: string | null;
  content: string;
  content_type: string;
  metadata: any;
  embedding: number[] | null;
}

export interface IngestionStats {
  totalChunks: number;
  successfulChunks: number;
  failedChunks: number;
  duplicateChunks: number;
  startTime: Date;
  endTime?: Date;
  errors: Array<{chunk: number; error: string}>;
}

export class DatabaseIngestor {
  private supabase: SupabaseClient;
  private stats: IngestionStats;
  
  constructor() {
    // Use service role key which should bypass RLS
    this.supabase = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    this.stats = {
      totalChunks: 0,
      successfulChunks: 0,
      failedChunks: 0,
      duplicateChunks: 0,
      startTime: new Date(),
      errors: []
    };
    
    // Check if we can access the table
    this.checkTableAccess();
  }
  
  private async checkTableAccess(): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('knowledge_base')
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        logger.warn('⚠️  Cannot access knowledge_base table. This might be due to RLS policies.');
        logger.warn('   Please ensure RLS is disabled or properly configured for ingestion.');
        logger.warn('   You can disable RLS temporarily with:');
        logger.warn('   ALTER TABLE knowledge_base DISABLE ROW LEVEL SECURITY;');
      } else {
        logger.info('✅ Knowledge base table access confirmed');
      }
    } catch (e) {
      logger.error('Failed to check table access:', e);
    }
  }

  async insertBatch(chunks: ProcessedChunk[]): Promise<void> {
    if (chunks.length === 0) return;
    
    this.stats.totalChunks += chunks.length;
    
    try {
      // Check for existing chunks to avoid duplicates
      const contentHashes = chunks.map(chunk => this.generateContentHash(chunk));
      const { data: existingChunks } = await this.supabase
        .from('knowledge_base')
        .select('id, metadata')
        .in('metadata->>content_hash', contentHashes);
      
      const existingHashes = new Set(
        existingChunks?.map(chunk => chunk.metadata?.content_hash) || []
      );
      
      // Filter out duplicates
      const newChunks = chunks.filter(chunk => {
        const hash = this.generateContentHash(chunk);
        if (existingHashes.has(hash)) {
          this.stats.duplicateChunks++;
          return false;
        }
        return true;
      });
      
      if (newChunks.length === 0) {
        logger.info(`All ${chunks.length} chunks already exist, skipping`);
        return;
      }
      
      // Add content hash to metadata
      const chunksWithHash = newChunks.map(chunk => ({
        ...chunk,
        metadata: {
          ...chunk.metadata,
          content_hash: this.generateContentHash(chunk),
          ingested_at: new Date().toISOString()
        }
      }));
      
      // Insert new chunks
      const { data, error } = await this.supabase
        .from('knowledge_base')
        .insert(chunksWithHash)
        .select();
      
      if (error) {
        this.stats.failedChunks += newChunks.length;
        this.stats.errors.push({
          chunk: this.stats.totalChunks - chunks.length,
          error: error.message
        });
        throw error;
      }
      
      this.stats.successfulChunks += newChunks.length;
      logger.info(`Successfully inserted ${newChunks.length} chunks (${this.stats.duplicateChunks} duplicates skipped)`);
      
    } catch (error) {
      logger.error('Error inserting batch:', error);
      throw error;
    }
  }

  async upsertChunks(chunks: ProcessedChunk[]): Promise<void> {
    if (chunks.length === 0) return;
    
    this.stats.totalChunks += chunks.length;
    
    try {
      // Add content hash and timestamp to metadata
      const chunksWithMetadata = chunks.map(chunk => ({
        ...chunk,
        metadata: {
          ...chunk.metadata,
          content_hash: this.generateContentHash(chunk),
          ingested_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }));
      
      // Upsert chunks (will update if content_hash matches)
      const { data, error } = await this.supabase
        .from('knowledge_base')
        .upsert(chunksWithMetadata, {
          onConflict: 'interpreter_type,source,chapter,content_type',
          ignoreDuplicates: false
        })
        .select();
      
      if (error) {
        this.stats.failedChunks += chunks.length;
        this.stats.errors.push({
          chunk: this.stats.totalChunks - chunks.length,
          error: error.message
        });
        throw error;
      }
      
      this.stats.successfulChunks += chunks.length;
      logger.info(`Successfully upserted ${chunks.length} chunks`);
      
    } catch (error) {
      logger.error('Error upserting chunks:', error);
      throw error;
    }
  }

  async verifyIngestion(source: string, interpreterType: string): Promise<{
    totalChunks: number;
    avgEmbeddingNorm: number;
    contentTypes: Record<string, number>;
    topics: Record<string, number>;
  }> {
    try {
      // Get all chunks for this source
      const { data: chunks, error } = await this.supabase
        .from('knowledge_base')
        .select('content_type, metadata, embedding')
        .eq('source', source)
        .eq('interpreter_type', interpreterType);
      
      if (error) throw error;
      
      if (!chunks || chunks.length === 0) {
        return {
          totalChunks: 0,
          avgEmbeddingNorm: 0,
          contentTypes: {},
          topics: {}
        };
      }
      
      // Calculate statistics
      const contentTypes: Record<string, number> = {};
      const topics: Record<string, number> = {};
      let totalNorm = 0;
      let validEmbeddings = 0;
      
      chunks.forEach(chunk => {
        // Count content types
        contentTypes[chunk.content_type] = (contentTypes[chunk.content_type] || 0) + 1;
        
        // Count topics
        const chunkTopics = chunk.metadata?.classification?.topic;
        if (chunkTopics) {
          if (Array.isArray(chunkTopics)) {
            chunkTopics.forEach((topic: string) => {
              topics[topic] = (topics[topic] || 0) + 1;
            });
          } else {
            topics[chunkTopics] = (topics[chunkTopics] || 0) + 1;
          }
        }
        
        // Calculate embedding norm
        if (chunk.embedding && Array.isArray(chunk.embedding)) {
          const norm = Math.sqrt(
            chunk.embedding.reduce((sum: number, val: number) => sum + val * val, 0)
          );
          totalNorm += norm;
          validEmbeddings++;
        }
      });
      
      return {
        totalChunks: chunks.length,
        avgEmbeddingNorm: validEmbeddings > 0 ? totalNorm / validEmbeddings : 0,
        contentTypes,
        topics
      };
      
    } catch (error) {
      logger.error('Error verifying ingestion:', error);
      throw error;
    }
  }

  async deleteSource(source: string, interpreterType: string): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('knowledge_base')
        .delete()
        .eq('source', source)
        .eq('interpreter_type', interpreterType)
        .select();
      
      if (error) throw error;
      
      const deletedCount = data?.length || 0;
      logger.info(`Deleted ${deletedCount} chunks for ${source} (${interpreterType})`);
      
      return deletedCount;
      
    } catch (error) {
      logger.error('Error deleting source:', error);
      throw error;
    }
  }

  private generateContentHash(chunk: ProcessedChunk): string {
    // Create a hash from content and key metadata
    const hashSource = `${chunk.interpreter_type}:${chunk.source}:${chunk.content.substring(0, 100)}`;
    
    // Simple hash function (in production, use crypto.createHash)
    let hash = 0;
    for (let i = 0; i < hashSource.length; i++) {
      const char = hashSource.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  getStats(): IngestionStats {
    return {
      ...this.stats,
      endTime: new Date()
    };
  }

  resetStats(): void {
    this.stats = {
      totalChunks: 0,
      successfulChunks: 0,
      failedChunks: 0,
      duplicateChunks: 0,
      startTime: new Date(),
      errors: []
    };
  }

  printStats(): void {
    const stats = this.getStats();
    const duration = stats.endTime ? 
      (stats.endTime.getTime() - stats.startTime.getTime()) / 1000 : 0;
    
    console.log('\n=== Ingestion Statistics ===');
    console.log(`Total chunks: ${stats.totalChunks}`);
    console.log(`Successful: ${stats.successfulChunks}`);
    console.log(`Failed: ${stats.failedChunks}`);
    console.log(`Duplicates: ${stats.duplicateChunks}`);
    console.log(`Duration: ${duration.toFixed(2)}s`);
    
    if (stats.errors.length > 0) {
      console.log('\nErrors:');
      stats.errors.forEach(err => {
        console.log(`  - Chunk ${err.chunk}: ${err.error}`);
      });
    }
    
    console.log('===========================\n');
  }
}