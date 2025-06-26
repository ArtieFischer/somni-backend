/**
 * Simulate the exact retrieval process used in interpretation
 */

import { ThemeKnowledgeRetriever } from '../services/theme-knowledge-retriever';

async function testRetrievalSimulation() {
  console.log('🔍 Simulating knowledge retrieval for each interpreter\n');
  
  const retriever = ThemeKnowledgeRetriever.getInstance();
  const testThemes = ['home', 'ocean', 'mother', 'glass', 'water'];
  const interpreters = ['jung', 'lakshmi', 'freud', 'mary'] as const;
  
  for (const interpreter of interpreters) {
    console.log(`\n=== ${interpreter.toUpperCase()} ===`);
    
    try {
      // Call the exact method used in modular-three-stage-interpreter
      const fragments = await retriever.getKnowledgeByThemes(
        testThemes,
        interpreter
      );
      
      console.log(`Retrieved ${fragments.length} fragments`);
      
      if (fragments.length > 0) {
        console.log('\nFragment themes:');
        const themeCount = new Map<string, number>();
        fragments.forEach(f => {
          f.themes?.forEach(t => {
            themeCount.set(t, (themeCount.get(t) || 0) + 1);
          });
        });
        
        Array.from(themeCount.entries())
          .sort((a, b) => b[1] - a[1])
          .forEach(([theme, count]) => {
            console.log(`  ${theme}: ${count} fragments`);
          });
          
        console.log('\nRelevance scores:', fragments.map(f => f.relevanceScore.toFixed(3)).join(', '));
      }
    } catch (error) {
      console.error(`Error retrieving for ${interpreter}:`, error);
    }
  }
}

// Run test
testRetrievalSimulation().catch(console.error);