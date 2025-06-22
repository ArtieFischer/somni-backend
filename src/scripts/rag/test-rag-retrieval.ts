import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';
import { embeddingsService } from '../../services/embeddings.service';
import { logger } from '../../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

interface TestDream {
  id: string;
  category: string;
  title: string;
  transcription: string;
  expectedThemes: string[];
}

interface RetrievalResult {
  dreamId: string;
  title: string;
  category: string;
  topResults: Array<{
    content: string;
    source: string;
    contentType: string;
    similarity: number;
    topics: string[];
  }>;
  performance: {
    embeddingTime: number;
    searchTime: number;
    totalTime: number;
  };
}

class RAGTestSuite {
  private supabase = createClient(config.supabase.url, config.supabase.anonKey);
  
  private testDreams: TestDream[] = [
    // Classic Jungian Dreams (Should work very well)
    {
      id: 'classic-1',
      category: 'Classic Jungian',
      title: 'Shadow Encounter',
      transcription: "I was walking through a dark forest when I encountered a menacing figure dressed in black. It had my face but with evil eyes. We fought, and as I was about to lose, I realized it was part of me. When I accepted this, the figure transformed into a wise old man who gave me a golden key.",
      expectedThemes: ['shadow', 'wise old man', 'transformation', 'integration']
    },
    {
      id: 'classic-2',
      category: 'Classic Jungian',
      title: 'Anima Dream',
      transcription: "A beautiful mysterious woman appeared in my dream, leading me through an ancient temple. She spoke without words, and I understood everything. She showed me a mirror where I saw not my reflection but my soul. She dissolved into light and entered my heart.",
      expectedThemes: ['anima', 'temple', 'soul', 'feminine', 'integration']
    },
    {
      id: 'classic-3',
      category: 'Classic Jungian',
      title: 'Mandala Vision',
      transcription: "I saw a perfect circle divided into four parts, each containing different symbols - a tree, water, fire, and a mountain. In the center was a glowing jewel. As I watched, I realized I was inside the circle, and it was inside me. Everything was connected in perfect harmony.",
      expectedThemes: ['mandala', 'wholeness', 'four', 'symbols', 'self']
    },
    
    // Archetypal Dreams
    {
      id: 'archetype-1',
      category: 'Archetypal',
      title: 'Hero\'s Journey',
      transcription: "I had to rescue a child from a dragon in a cave. I was terrified but found a sword made of light. After defeating the dragon, it turned into gold. The child was actually myself as a young boy. We walked out together into the sunrise.",
      expectedThemes: ['hero', 'dragon', 'child', 'transformation', 'light']
    },
    {
      id: 'archetype-2',
      category: 'Archetypal',
      title: 'Great Mother',
      transcription: "An enormous woman appeared, as tall as mountains. She was nurturing the earth like a garden. When she saw me, she smiled and I felt completely safe. But then she showed her other face - terrifying and destructive. I understood both were necessary.",
      expectedThemes: ['mother', 'archetype', 'duality', 'earth', 'nurturing']
    },
    
    // Symbolic Dreams
    {
      id: 'symbol-1',
      category: 'Symbolic',
      title: 'Snake Transformation',
      transcription: "A golden snake bit my hand. Instead of dying, I began to shed my skin like the snake. Underneath was new, glowing skin. The snake then ate its own tail, forming a circle, and I understood the eternal cycle of death and rebirth.",
      expectedThemes: ['snake', 'ouroboros', 'transformation', 'rebirth', 'cycle']
    },
    {
      id: 'symbol-2',
      category: 'Symbolic',
      title: 'Water and Unconscious',
      transcription: "I dove into a deep lake and could breathe underwater. At the bottom, I found an ancient city with temples and statues. Fish swam through the air there. I realized this was my own mind, and the deeper I went, the more treasures I found.",
      expectedThemes: ['water', 'unconscious', 'depth', 'treasure', 'discovery']
    },
    
    // Modern/Technology Dreams (Challenging for Jung)
    {
      id: 'modern-1',
      category: 'Modern Technology',
      title: 'AI Consciousness',
      transcription: "I dreamed I was inside a computer, talking to an artificial intelligence. It showed me infinite data streams that looked like rivers of light. The AI asked me what it means to be human. I couldn't answer, and realized I was also unsure if I was human or machine.",
      expectedThemes: ['consciousness', 'identity', 'light', 'question']
    },
    {
      id: 'modern-2',
      category: 'Modern Technology',
      title: 'Social Media Void',
      transcription: "I was scrolling through endless social media feeds, but everyone's face was blank. My own posts disappeared into a black void. Likes and hearts fell like rain but dissolved before reaching me. I threw my phone away and it shattered into butterflies.",
      expectedThemes: ['void', 'identity', 'transformation', 'isolation']
    },
    {
      id: 'modern-3',
      category: 'Modern Technology',
      title: 'Virtual Reality Layers',
      transcription: "I kept taking off VR headsets, but under each one was another. Reality had infinite layers. In the deepest layer, I found an ancient wise man who said 'All realities are dreams, and all dreams are real.' Then I woke up, but wasn't sure which layer I was in.",
      expectedThemes: ['reality', 'layers', 'wise old man', 'dream']
    },
    
    // Abstract/Surreal Dreams
    {
      id: 'abstract-1',
      category: 'Abstract/Surreal',
      title: 'Color Emotions',
      transcription: "Colors had personalities and talked to me. Red was angry but protective. Blue was sad but wise. They were fighting over who owned my emotions. Yellow appeared as a child and united them all into white light. I became the rainbow.",
      expectedThemes: ['colors', 'emotions', 'unity', 'light', 'child']
    },
    {
      id: 'abstract-2',
      category: 'Abstract/Surreal',
      title: 'Time Spiral',
      transcription: "I was climbing a spiral staircase where each step was a different age of my life. I met myself as a child, teenager, and old man simultaneously. We all held hands and the staircase became a circle. Time stopped existing.",
      expectedThemes: ['time', 'spiral', 'self', 'ages', 'circle']
    },
    
    // Anxiety/Modern Life Dreams
    {
      id: 'anxiety-1',
      category: 'Modern Anxiety',
      title: 'Exam Unprepared',
      transcription: "I was in an exam room but the questions were in an unknown language. Everyone else was writing confidently. The clock was melting. When I finally understood one question, it asked 'Who are you really?' I woke up before answering.",
      expectedThemes: ['anxiety', 'test', 'identity', 'time']
    },
    {
      id: 'anxiety-2',
      category: 'Modern Anxiety',
      title: 'Workplace Maze',
      transcription: "My office became an endless maze of cubicles. Each one had a computer showing a different version of my life. My boss was a giant watching from above. I found an exit door that led to a forest, but I was afraid to leave.",
      expectedThemes: ['maze', 'work', 'choice', 'freedom', 'fear']
    },
    
    // Relationship Dreams
    {
      id: 'relationship-1',
      category: 'Relationships',
      title: 'Mirror Partner',
      transcription: "My partner and I were looking in a mirror, but our reflections were switched. When I moved, their reflection moved. We realized we were two halves of the same person. The mirror shattered and we became one being with four arms and two hearts.",
      expectedThemes: ['relationship', 'mirror', 'union', 'self', 'wholeness']
    },
    {
      id: 'relationship-2',
      category: 'Relationships',
      title: 'Family Constellation',
      transcription: "My family members were stars in the sky, connected by lines of light. Some connections were bright, others dim. I was in the center, pulling the strings. When I let go, they formed a beautiful constellation on their own.",
      expectedThemes: ['family', 'connection', 'light', 'letting go', 'pattern']
    },
    
    // Death/Transformation Dreams
    {
      id: 'death-1',
      category: 'Death/Transformation',
      title: 'Death and Rebirth',
      transcription: "I attended my own funeral. Everyone was sad except me - I was floating above, feeling free. My body turned into a tree that grew instantly. From its fruit, a baby emerged that was also me. The cycle continued endlessly.",
      expectedThemes: ['death', 'rebirth', 'tree', 'transformation', 'cycle']
    },
    
    // Nature/Earth Dreams
    {
      id: 'nature-1',
      category: 'Nature/Earth',
      title: 'Becoming Earth',
      transcription: "I lay on the ground and slowly merged with the earth. My body became soil, my veins became roots, my thoughts became wind. I could feel every living thing connected through me. I was the mountain, the river, and the sky simultaneously.",
      expectedThemes: ['earth', 'nature', 'connection', 'transformation', 'unity']
    },
    
    // Spiritual/Mystical Dreams
    {
      id: 'spiritual-1',
      category: 'Spiritual/Mystical',
      title: 'Light Being',
      transcription: "A being made of pure light visited me. It didn't speak but I understood everything about existence in that moment. It touched my forehead and I saw the universe inside me. When it left, I retained the knowledge that everything is connected by invisible threads of light.",
      expectedThemes: ['light', 'spiritual', 'knowledge', 'universe', 'connection']
    },
    
    // Mundane Dream (Should be challenging)
    {
      id: 'mundane-1',
      category: 'Mundane/Daily Life',
      title: 'Grocery Shopping',
      transcription: "I was at the supermarket buying groceries. The bananas were too green. I couldn't find the bread aisle. The cashier gave me incorrect change. I forgot my reusable bags in the car. Everything was frustratingly normal.",
      expectedThemes: ['daily life', 'frustration', 'mundane', 'normal']
    }
  ];
  
  async runTests(interpreterType: string = 'jung'): Promise<void> {
    console.log(`\n🧪 RAG Retrieval Test Suite - ${interpreterType.toUpperCase()}\n`);
    console.log(`Testing ${this.testDreams.length} different dream scenarios...\n`);
    
    const results: RetrievalResult[] = [];
    const startTime = Date.now();
    
    for (const dream of this.testDreams) {
      console.log(`\n[${dream.category}] ${dream.title}`);
      console.log('─'.repeat(50));
      
      try {
        const result = await this.testDreamRetrieval(dream, interpreterType);
        results.push(result);
        
        // Display top 3 results
        console.log(`\n📊 Top ${Math.min(3, result.topResults.length)} Retrieved Passages:`);
        
        result.topResults.slice(0, 3).forEach((res, idx) => {
          console.log(`\n${idx + 1}. [${res.contentType}] ${res.source} (similarity: ${res.similarity.toFixed(3)})`);
          console.log(`   Topics: ${res.topics.join(', ') || 'none'}`);
          console.log(`   "${res.content.substring(0, 150)}..."`);
        });
        
        console.log(`\n⏱️  Performance: Embedding ${result.performance.embeddingTime}ms, Search ${result.performance.searchTime}ms`);
        
      } catch (error) {
        console.error(`❌ Error testing dream:`, error);
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Generate summary report
    this.generateReport(results, startTime);
  }
  
  private async testDreamRetrieval(
    dream: TestDream, 
    interpreterType: string
  ): Promise<RetrievalResult> {
    const embeddingStart = Date.now();
    
    // Generate embedding for dream transcription
    const embedding = await embeddingsService.generateEmbedding(dream.transcription);
    
    const embeddingTime = Date.now() - embeddingStart;
    const searchStart = Date.now();
    
    // Search knowledge base
    const { data, error } = await this.supabase.rpc('search_knowledge', {
      query_embedding: embedding,
      target_interpreter: interpreterType,
      similarity_threshold: 0.3, // Lowered threshold for better recall
      max_results: 10
    });
    
    const searchTime = Date.now() - searchStart;
    
    if (error) {
      throw new Error(`Search failed: ${error.message}`);
    }
    
    // Enhance results with metadata
    const enrichedResults = await this.enrichResults(data || []);
    
    return {
      dreamId: dream.id,
      title: dream.title,
      category: dream.category,
      topResults: enrichedResults,
      performance: {
        embeddingTime,
        searchTime,
        totalTime: embeddingTime + searchTime
      }
    };
  }
  
  private async enrichResults(results: any[]): Promise<any[]> {
    // Get full metadata for each result
    const enriched = [];
    
    for (const result of results) {
      const { data } = await this.supabase
        .from('knowledge_base')
        .select('metadata')
        .eq('id', result.id)
        .single();
      
      enriched.push({
        content: result.content,
        source: result.source,
        contentType: result.content_type,
        similarity: result.similarity,
        topics: data?.metadata?.classification?.subtopics || []
      });
    }
    
    return enriched;
  }
  
  private generateReport(results: RetrievalResult[], startTime: number): void {
    const totalTime = Date.now() - startTime;
    
    console.log('\n\n' + '═'.repeat(60));
    console.log('📈 RAG RETRIEVAL TEST REPORT');
    console.log('═'.repeat(60));
    
    // Category performance
    const categoryStats = new Map<string, {
      avgSimilarity: number;
      avgResultCount: number;
      dreams: number;
    }>();
    
    results.forEach(result => {
      const stats = categoryStats.get(result.category) || {
        avgSimilarity: 0,
        avgResultCount: 0,
        dreams: 0
      };
      
      const avgSim = result.topResults.length > 0 
        ? result.topResults.reduce((sum, r) => sum + r.similarity, 0) / result.topResults.length
        : 0;
      
      stats.avgSimilarity = (stats.avgSimilarity * stats.dreams + avgSim) / (stats.dreams + 1);
      stats.avgResultCount = (stats.avgResultCount * stats.dreams + result.topResults.length) / (stats.dreams + 1);
      stats.dreams++;
      
      categoryStats.set(result.category, stats);
    });
    
    console.log('\n📊 Performance by Category:');
    console.log('─'.repeat(60));
    
    Array.from(categoryStats.entries())
      .sort(([, a], [, b]) => b.avgSimilarity - a.avgSimilarity)
      .forEach(([category, stats]) => {
        console.log(`\n${category}:`);
        console.log(`  Average Similarity: ${stats.avgSimilarity.toFixed(3)}`);
        console.log(`  Average Results: ${stats.avgResultCount.toFixed(1)}`);
        console.log(`  Dreams Tested: ${stats.dreams}`);
      });
    
    // Content type distribution
    const contentTypes = new Map<string, number>();
    results.forEach(result => {
      result.topResults.forEach(r => {
        contentTypes.set(r.contentType, (contentTypes.get(r.contentType) || 0) + 1);
      });
    });
    
    console.log('\n📚 Retrieved Content Types:');
    console.log('─'.repeat(60));
    Array.from(contentTypes.entries())
      .sort(([, a], [, b]) => b - a)
      .forEach(([type, count]) => {
        console.log(`  ${type}: ${count} passages`);
      });
    
    // Performance metrics
    const avgEmbeddingTime = results.reduce((sum, r) => sum + r.performance.embeddingTime, 0) / results.length;
    const avgSearchTime = results.reduce((sum, r) => sum + r.performance.searchTime, 0) / results.length;
    
    console.log('\n⚡ Performance Metrics:');
    console.log('─'.repeat(60));
    console.log(`  Total Test Time: ${(totalTime / 1000).toFixed(1)}s`);
    console.log(`  Average Embedding Time: ${avgEmbeddingTime.toFixed(0)}ms`);
    console.log(`  Average Search Time: ${avgSearchTime.toFixed(0)}ms`);
    console.log(`  Average Total Time per Dream: ${(avgEmbeddingTime + avgSearchTime).toFixed(0)}ms`);
    
    // Success metrics
    const successfulRetrievals = results.filter(r => r.topResults.length > 0).length;
    const highQualityRetrievals = results.filter(r => 
      r.topResults.some(res => res.similarity > 0.6)  // Adjusted for realistic expectations
    ).length;
    const mediumQualityRetrievals = results.filter(r => 
      r.topResults.some(res => res.similarity > 0.5)
    ).length;
    
    console.log('\n✅ Success Metrics:');
    console.log('─'.repeat(60));
    console.log(`  Dreams with Results: ${successfulRetrievals}/${results.length} (${(successfulRetrievals/results.length*100).toFixed(1)}%)`);
    console.log(`  Dreams with High-Quality Matches (>0.6): ${highQualityRetrievals}/${results.length} (${(highQualityRetrievals/results.length*100).toFixed(1)}%)`);
    console.log(`  Dreams with Medium-Quality Matches (>0.5): ${mediumQualityRetrievals}/${results.length} (${(mediumQualityRetrievals/results.length*100).toFixed(1)}%)`);
    
    // Save detailed results
    const reportPath = path.join(process.cwd(), `rag-test-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify({
      testDate: new Date().toISOString(),
      totalDreams: this.testDreams.length,
      results: results,
      categoryStats: Object.fromEntries(categoryStats),
      contentTypes: Object.fromEntries(contentTypes),
      performanceMetrics: {
        totalTimeSeconds: totalTime / 1000,
        avgEmbeddingTimeMs: avgEmbeddingTime,
        avgSearchTimeMs: avgSearchTime
      }
    }, null, 2));
    
    console.log(`\n💾 Detailed report saved to: ${reportPath}`);
    console.log('\n' + '═'.repeat(60) + '\n');
  }
}

// Run tests
async function main() {
  const tester = new RAGTestSuite();
  
  try {
    await tester.runTests('jung');
    
    // You can also test other interpreters:
    // await tester.runTests('freud');
    // await tester.runTests('mary');
    // await tester.runTests('lakshmi');
    
  } catch (error) {
    console.error('Test suite failed:', error);
  } finally {
    await embeddingsService.cleanup();
  }
}

if (require.main === module) {
  main().catch(console.error);
}