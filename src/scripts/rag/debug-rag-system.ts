import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';
import { embeddingsService } from '../../services/embeddings.service';
import { logger } from '../../utils/logger';

class RAGDebugger {
  private supabase = createClient(config.supabase.url, config.supabase.anonKey);
  
  async runDiagnostics(): Promise<void> {
    console.log('🔍 RAG System Diagnostics\n');
    
    // 1. Check knowledge base stats
    await this.checkKnowledgeBaseStats();
    
    // 2. Test with known Jung concepts
    await this.testKnownConcepts();
    
    // 3. Test similarity thresholds
    await this.testSimilarityThresholds();
    
    // 4. Analyze content distribution
    await this.analyzeContentDistribution();
    
    // 5. Test direct text matching
    await this.testDirectTextMatching();
  }
  
  private async checkKnowledgeBaseStats(): Promise<void> {
    console.log('📊 Knowledge Base Statistics:');
    console.log('─'.repeat(50));
    
    // Total chunks
    const { count: totalChunks } = await this.supabase
      .from('knowledge_base')
      .select('*', { count: 'exact', head: true });
    
    console.log(`Total chunks: ${totalChunks}`);
    
    // By interpreter
    const interpreters = ['jung', 'freud', 'mary', 'lakshmi'];
    for (const interp of interpreters) {
      const { count } = await this.supabase
        .from('knowledge_base')
        .select('*', { count: 'exact', head: true })
        .eq('interpreter_type', interp);
      
      console.log(`  ${interp}: ${count} chunks`);
    }
    
    // By content type
    console.log('\nContent types:');
    const { data: contentTypes } = await this.supabase
      .from('knowledge_base')
      .select('content_type')
      .eq('interpreter_type', 'jung');
    
    const typeCounts = new Map<string, number>();
    contentTypes?.forEach(row => {
      typeCounts.set(row.content_type, (typeCounts.get(row.content_type) || 0) + 1);
    });
    
    Array.from(typeCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
    
    console.log();
  }
  
  private async testKnownConcepts(): Promise<void> {
    console.log('🎯 Testing Known Jung Concepts:');
    console.log('─'.repeat(50));
    
    const concepts = [
      'shadow archetype',
      'collective unconscious',
      'anima and animus',
      'individuation process',
      'dream interpretation',
      'mandala symbolism',
      'synchronicity',
      'the Self archetype'
    ];
    
    for (const concept of concepts) {
      const embedding = await embeddingsService.generateEmbedding(concept);
      
      const { data, error } = await this.supabase.rpc('search_knowledge', {
        query_embedding: embedding,
        target_interpreter: 'jung',
        similarity_threshold: 0.3, // Lower threshold
        max_results: 3
      });
      
      if (error) {
        console.log(`❌ "${concept}": Error - ${error.message}`);
      } else {
        const avgSim = data.length > 0 
          ? data.reduce((sum: number, r: any) => sum + r.similarity, 0) / data.length
          : 0;
        console.log(`${data.length > 0 ? '✓' : '✗'} "${concept}": ${data.length} results, avg similarity: ${avgSim.toFixed(3)}`);
      }
    }
    
    console.log();
  }
  
  private async testSimilarityThresholds(): Promise<void> {
    console.log('📏 Testing Similarity Thresholds:');
    console.log('─'.repeat(50));
    
    const testQuery = "I dreamed about my shadow self and transformation";
    const embedding = await embeddingsService.generateEmbedding(testQuery);
    
    const thresholds = [0.7, 0.6, 0.5, 0.4, 0.3, 0.2];
    
    for (const threshold of thresholds) {
      const { data } = await this.supabase.rpc('search_knowledge', {
        query_embedding: embedding,
        target_interpreter: 'jung',
        similarity_threshold: threshold,
        max_results: 100
      });
      
      console.log(`Threshold ${threshold}: ${data?.length || 0} results`);
      
      if (data && data.length > 0) {
        const sims = data.map((r: any) => r.similarity);
        console.log(`  Similarity range: ${Math.min(...sims).toFixed(3)} - ${Math.max(...sims).toFixed(3)}`);
      }
    }
    
    console.log();
  }
  
  private async analyzeContentDistribution(): Promise<void> {
    console.log('📚 Content Analysis:');
    console.log('─'.repeat(50));
    
    // Sample some content
    const { data: samples } = await this.supabase
      .from('knowledge_base')
      .select('content, metadata')
      .eq('interpreter_type', 'jung')
      .limit(10);
    
    console.log('Sample chunk lengths:');
    samples?.forEach((sample, idx) => {
      const topics = sample.metadata?.classification?.subtopics || [];
      console.log(`  ${idx + 1}. ${sample.content.length} chars, topics: ${topics.slice(0, 3).join(', ')}`);
    });
    
    // Check for specific keywords
    console.log('\nKeyword presence check:');
    const keywords = ['dream', 'shadow', 'archetype', 'unconscious', 'symbol'];
    
    for (const keyword of keywords) {
      const { count } = await this.supabase
        .from('knowledge_base')
        .select('*', { count: 'exact', head: true })
        .eq('interpreter_type', 'jung')
        .ilike('content', `%${keyword}%`);
      
      console.log(`  "${keyword}": ${count} chunks`);
    }
    
    console.log();
  }
  
  private async testDirectTextMatching(): Promise<void> {
    console.log('🔤 Direct Text Matching Test:');
    console.log('─'.repeat(50));
    
    // Get a real chunk from the database
    const { data: sampleChunk } = await this.supabase
      .from('knowledge_base')
      .select('content, id')
      .eq('interpreter_type', 'jung')
      .ilike('content', '%shadow%')
      .limit(1)
      .single();
    
    if (sampleChunk) {
      console.log('Testing with actual chunk content...');
      console.log(`Chunk preview: "${sampleChunk.content.substring(0, 100)}..."`);
      
      // Generate embedding for the exact content
      const embedding = await embeddingsService.generateEmbedding(sampleChunk.content);
      
      // Search for it
      const { data: results } = await this.supabase.rpc('search_knowledge', {
        query_embedding: embedding,
        target_interpreter: 'jung',
        similarity_threshold: 0.5,
        max_results: 5
      });
      
      console.log(`\nSearch results: ${results?.length || 0} found`);
      
      if (results && results.length > 0) {
        const selfMatch = results.find((r: any) => r.id === sampleChunk.id);
        if (selfMatch) {
          console.log(`✓ Self-match similarity: ${selfMatch.similarity.toFixed(3)} (should be close to 1.0)`);
        } else {
          console.log('✗ Could not find self in results!');
        }
        
        console.log('\nTop 3 similarities:');
        results.slice(0, 3).forEach((r: any, idx: number) => {
          console.log(`  ${idx + 1}. ${r.similarity.toFixed(3)} - "${r.content.substring(0, 80)}..."`);
        });
      }
    }
    
    console.log();
  }
}

// Additional test to check embedding consistency
async function testEmbeddingConsistency() {
  console.log('🔄 Testing Embedding Consistency:');
  console.log('─'.repeat(50));
  
  const testText = "The shadow archetype represents the hidden aspects of personality";
  
  // Generate embedding multiple times
  const embeddings = [];
  for (let i = 0; i < 3; i++) {
    const emb = await embeddingsService.generateEmbedding(testText);
    embeddings.push(emb);
  }
  
  // Check if embeddings are identical
  let identical = true;
  for (let i = 1; i < embeddings.length; i++) {
    for (let j = 0; j < embeddings[0].length; j++) {
      if (Math.abs(embeddings[0][j] - embeddings[i][j]) > 0.0001) {
        identical = false;
        break;
      }
    }
  }
  
  console.log(`Embeddings are ${identical ? 'consistent ✓' : 'inconsistent ✗'}`);
  
  // Calculate self-similarity
  const dotProduct = embeddings[0].reduce((sum, val, idx) => sum + val * embeddings[0][idx], 0);
  const magnitude = Math.sqrt(embeddings[0].reduce((sum, val) => sum + val * val, 0));
  console.log(`Embedding magnitude: ${magnitude.toFixed(4)} (should be ~1.0 if normalized)`);
  console.log(`Self dot product: ${dotProduct.toFixed(4)}`);
}

// Run diagnostics
async function main() {
  const ragDebugger = new RAGDebugger();
  
  try {
    await ragDebugger.runDiagnostics();
    await testEmbeddingConsistency();
    
    console.log('\n💡 Recommendations:');
    console.log('─'.repeat(50));
    console.log('1. Consider lowering similarity threshold to 0.3-0.4');
    console.log('2. The embedding model might need fine-tuning for dream content');
    console.log('3. Consider adding more dream-specific examples to the knowledge base');
    console.log('4. Check if chunks are too large and losing semantic focus');
    console.log('5. Consider using a more powerful embedding model (gte-small)');
    
  } catch (error) {
    console.error('Diagnostic failed:', error);
  } finally {
    await embeddingsService.cleanup();
  }
}

if (require.main === module) {
  main().catch(console.error);
}