import { hybridRAGService } from '../../services/hybrid-rag.service';
import { embeddingsService } from '../../services/embeddings.service';

// Test dreams covering different scenarios
const testDreams = [
  {
    name: "Classic Jungian - Snake",
    dream: "I dreamed of a large black snake in my garden. It was both frightening and fascinating."
  },
  {
    name: "Modern Technology - AI",
    dream: "I dreamed that artificial intelligence was taking over my job and making all my decisions."
  },
  {
    name: "Classic Freudian - Death",
    dream: "I kept dreaming about my father dying, even though he's still alive and healthy."
  },
  {
    name: "Modern Social - Social Media",
    dream: "In my dream, everyone was watching me through their phones and judging my every move."
  },
  {
    name: "Archetypal - Shadow",
    dream: "There was a dark version of myself following me around, doing terrible things."
  },
  {
    name: "Modern Existential - VR",
    dream: "I was trapped in virtual reality and couldn't tell what was real anymore."
  },
  {
    name: "Universal - Flying",
    dream: "I was flying over my childhood home, feeling both free and afraid of falling."
  },
  {
    name: "Modern Anxiety - Climate",
    dream: "The world was ending due to climate change and I was the only one who cared."
  }
];

async function testHybridRAG() {
  console.log('🚀 Testing Hybrid RAG System');
  console.log('=' .repeat(80));
  console.log('Comparing BM25 + Semantic + Hybrid approaches for Jung interpretation\n');

  let totalTests = 0;
  let hybridBetter = 0;
  let semanticBetter = 0;
  let bm25Better = 0;

  for (const testCase of testDreams) {
    totalTests++;
    console.log(`\n📊 Test ${totalTests}: ${testCase.name}`);
    console.log(`Dream: "${testCase.dream}"`);
    console.log('-'.repeat(80));

    try {
      // Test all three approaches
      const results = await hybridRAGService.searchKnowledge(testCase.dream, {
        interpreterType: 'jung',
        maxResults: 3,
        bm25Weight: 0.4,
        semanticWeight: 0.6
      });

      if (results.length > 0) {
        const topResult = results[0];
        console.log(`🥇 Top Result (Hybrid Score: ${topResult.scores.hybrid.toFixed(3)}):`);
        console.log(`   BM25: ${topResult.scores.bm25?.toFixed(3) || 'N/A'} | Semantic: ${topResult.scores.semantic?.toFixed(3) || 'N/A'}`);
        console.log(`   Source: ${topResult.source} - ${topResult.chapter}`);
        console.log(`   Content: ${topResult.content.substring(0, 150)}...`);

        // Simple scoring to see which approach would have performed better alone
        const bm25Score = topResult.scores.bm25 || 0;
        const semanticScore = topResult.scores.semantic || 0;
        const hybridScore = topResult.scores.hybrid;

        // Determine which single approach would have scored highest
        if (bm25Score > semanticScore && hybridScore > Math.max(bm25Score * 0.4, semanticScore * 0.6)) {
          hybridBetter++;
          console.log(`   ✅ Hybrid approach performed best`);
        } else if (bm25Score > semanticScore) {
          bm25Better++;
          console.log(`   📝 BM25 would have been better (${bm25Score.toFixed(3)} vs ${semanticScore.toFixed(3)})`);
        } else {
          semanticBetter++;
          console.log(`   🧠 Semantic would have been better (${semanticScore.toFixed(3)} vs ${bm25Score.toFixed(3)})`);
        }
      } else {
        console.log('❌ No results found');
      }
    } catch (error) {
      console.error(`❌ Error testing ${testCase.name}:`, error);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📈 HYBRID RAG TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total tests: ${totalTests}`);
  console.log(`Hybrid better: ${hybridBetter} (${((hybridBetter / totalTests) * 100).toFixed(1)}%)`);
  console.log(`BM25 better: ${bm25Better} (${((bm25Better / totalTests) * 100).toFixed(1)}%)`);
  console.log(`Semantic better: ${semanticBetter} (${((semanticBetter / totalTests) * 100).toFixed(1)}%)`);
  
  if (hybridBetter >= Math.max(bm25Better, semanticBetter)) {
    console.log('\n✅ Hybrid approach shows promise! It performs well by combining both methods.');
  } else if (semanticBetter > bm25Better) {
    console.log('\n🧠 Semantic search dominates - consider increasing semantic weight.');
  } else {
    console.log('\n📝 BM25 lexical search dominates - consider increasing BM25 weight.');
  }
}

async function debugSpecificDreams() {
  console.log('\n🔍 DETAILED DEBUG FOR KEY DREAMS');
  console.log('='.repeat(80));

  // Test a few key cases with detailed breakdown
  const debugCases = [
    "I dreamed of a snake that turned into my mother",
    "My phone was controlling my thoughts in the dream", 
    "I was flying but also falling at the same time"
  ];

  for (const dream of debugCases) {
    await hybridRAGService.debugSearch(dream, 'jung');
  }
}

async function main() {
  try {
    console.log('🧪 Hybrid RAG Testing Suite');
    console.log('Testing multi-qa-MiniLM-L6-cos-v1 embeddings with BM25 + Semantic hybrid approach\n');

    // Run the main test suite
    await testHybridRAG();

    // Run detailed debug for specific cases
    await debugSpecificDreams();

    console.log('\n✅ All tests completed!');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  } finally {
    // Cleanup
    await embeddingsService.cleanup();
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { testHybridRAG, debugSpecificDreams };