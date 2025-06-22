#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';
import { bgeEmbeddingsService } from '../../services/embeddings-bge.service';
import { improvedKnowledgeClassifier } from './core/knowledge-classifier-bge-improved';
import { logger } from '../../utils/logger';

async function testSmallIngestion() {
  const supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey
  );

  logger.info('🧪 Testing improved classifier with small Jung text sample...');

  try {
    // Read a small sample from dreams.txt
    const dreamsPath = path.join(process.cwd(), 'RAG-data', 'jung', 'dreams.txt');
    const fullText = fs.readFileSync(dreamsPath, 'utf-8');
    
    // Take first ~2000 characters to test with
    const sampleText = fullText.substring(0, 2000);
    
    // Split into chunks like the real ingestion would
    const chunks = sampleText.split('\n\n').filter(chunk => chunk.trim().length > 100);
    
    logger.info(`📖 Testing with ${chunks.length} chunks from dreams.txt`);
    
    // Initialize services
    logger.info('🔧 Initializing BGE-M3...');
    const testEmbedding = await bgeEmbeddingsService.generateFullEmbedding('test');
    logger.info(`✅ BGE-M3 ready (${testEmbedding.dense.length}D)`);
    
    const results = [];
    
    // Process each chunk
    for (let i = 0; i < Math.min(chunks.length, 3); i++) {
      const chunk = chunks[i];
      logger.info(`\n📝 Processing chunk ${i + 1}:`);
      logger.info(`Content: "${chunk.substring(0, 150)}..."`);
      
      try {
        // Classify with improved classifier
        const classification = await improvedKnowledgeClassifier.classifyContent(chunk, 'jung');
        
        // Generate embedding
        const embedding = await bgeEmbeddingsService.generateFullEmbedding(chunk);
        
        results.push({
          chunk_index: i,
          content: chunk,
          classification,
          embedding_size: embedding.dense.length,
          has_sparse: !!embedding.sparse
        });
        
        logger.info(`✅ Results:`);
        logger.info(`   - Content Type: ${classification.primary_type}`);
        logger.info(`   - Themes (${classification.applicable_themes?.length || 0}): ${classification.applicable_themes?.join(', ') || 'none'}`);
        logger.info(`   - Theme Confidence: ${classification.theme_confidence?.toFixed(3) || 0}`);
        logger.info(`   - Symbols: ${classification.symbols_present?.join(', ') || 'none'}`);
        logger.info(`   - Concepts: ${classification.jungian_concepts?.join(', ') || 'none'}`);
        
        // Check if this looks like theoretical vs dream content
        const isTheoretical = chunk.toLowerCase().includes('theory') || 
                             chunk.toLowerCase().includes('freud') ||
                             chunk.toLowerCase().includes('analysis') ||
                             chunk.toLowerCase().includes('method');
        
        if (isTheoretical && (classification.applicable_themes?.length || 0) > 2) {
          logger.warn(`⚠️  Theoretical content got ${classification.applicable_themes?.length} themes - may need adjustment`);
        }
        
      } catch (error) {
        logger.error(`❌ Error processing chunk ${i}:`, error);
      }
    }
    
    // Summary
    logger.info(`\n📊 Test Summary:`);
    logger.info(`   - Chunks processed: ${results.length}`);
    logger.info(`   - Average themes per chunk: ${(results.reduce((sum, r) => sum + (r.classification.applicable_themes?.length || 0), 0) / results.length).toFixed(1)}`);
    
    // Show content type distribution
    const typeCount = new Map();
    results.forEach(r => {
      const type = r.classification.primary_type;
      typeCount.set(type, (typeCount.get(type) || 0) + 1);
    });
    
    logger.info(`   - Content types: ${Array.from(typeCount.entries()).map(([type, count]) => `${type}(${count})`).join(', ')}`);
    
    // Check for improvement indicators
    const lowThemeTheoretical = results.filter(r => {
      const isTheory = r.classification.primary_type === 'theory' || r.classification.primary_type === 'methodology';
      const hasMinimalThemes = (r.classification.applicable_themes?.length || 0) <= 2;
      return isTheory && hasMinimalThemes;
    }).length;
    
    logger.info(`   - Theoretical content with minimal themes: ${lowThemeTheoretical}/${results.length}`);
    
    if (lowThemeTheoretical > 0) {
      logger.info(`✅ Good! Theoretical content is getting fewer random themes.`);
    } else {
      logger.warn(`⚠️  No theoretical content detected, or still getting too many themes.`);
    }
    
  } catch (error) {
    logger.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await bgeEmbeddingsService.cleanup();
  }
}

if (require.main === module) {
  testSmallIngestion()
    .then(() => {
      logger.info('\n✅ Small ingestion test complete!');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Fatal error:', error);
      process.exit(1);
    });
}