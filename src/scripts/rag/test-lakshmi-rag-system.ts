#!/usr/bin/env node
/**
 * Test complete RAG system for Lakshmi interpreter
 * Tests dream → theme → fragment flow with New Age content
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { bgeEmbeddingsService } from '../../services/embeddings-bge.service.js';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test dreams - same as Jung test for comparison
const testDreams = [
  {
    id: 'dream_1',
    title: 'Late for Work',
    content: `I was rushing to get to work but everything kept going wrong. My alarm didn't go off and I woke up two hours late. I couldn't find my car keys anywhere, searched the whole house. When I finally found them, my car wouldn't start. I tried to call an Uber but my phone was dead. I started running to work in my pajamas and realized I forgot to get dressed. Everyone on the street was staring at me.`
  },
  {
    id: 'dream_2', 
    title: 'Flying Over City',
    content: `I was flying above the city without any airplane or wings, just floating through the air. I could see all the buildings below me like tiny toys. The feeling was incredible, like swimming through the sky. I flew over my old elementary school and saw children playing in the yard. Then I went higher into the clouds which felt soft and cool. I could control where I went just by thinking about it.`
  },
  {
    id: 'dream_3',
    title: 'Lost in Mall',
    content: `I was in a huge shopping mall that seemed to go on forever. I was looking for a specific store but all the signs were in a language I couldn't read. Every escalator I took led to another identical floor. I asked people for help but they just walked past me like I was invisible. The mall started getting darker and stores were closing. I couldn't find any exit doors, just more shops stretching endlessly.`
  },
  {
    id: 'dream_4',
    title: 'Beach Vacation',
    content: `I was on a beautiful tropical beach with crystal clear water. The sand was perfectly white and warm between my toes. I was building a sandcastle that kept getting bigger and more elaborate, with towers and bridges. Colorful fish were swimming in the shallow water near the shore. My family was there having a picnic under a palm tree. The sun was setting and the sky turned amazing shades of orange and pink.`
  },
  {
    id: 'dream_5',
    title: 'Back in School',
    content: `I was back in high school and had a final exam I didn't study for. I couldn't remember which classroom to go to and the hallways kept changing. When I finally found the room, everyone was already halfway through the test. I looked at the questions but they were all in math symbols I'd never seen before. My pencil kept breaking every time I tried to write. The teacher kept announcing how little time was left.`
  }
];

async function analyzeDream(dream: typeof testDreams[0]) {
  console.log(`\n🔮 Analyzing: "${dream.title}"`);
  
  // Generate embedding for dream
  const dreamEmbedding = await bgeEmbeddingsService.generateEmbedding(dream.content);
  
  // Step 1: Find matching themes
  const { data: themes, error: themeError } = await supabase.rpc('search_themes', {
    query_embedding: dreamEmbedding,
    similarity_threshold: 0.35,
    max_results: 10
  });
  
  if (themeError) {
    console.error('Error finding themes:', themeError);
    return null;
  }
  
  console.log(`   Found ${themes?.length || 0} matching themes`);
  
  // Step 2: Find Lakshmi fragments for these themes
  const themeFragments = [];
  
  if (themes && themes.length > 0) {
    for (const theme of themes.slice(0, 5)) { // Top 5 themes
      const { data: fragments, error: fragmentError } = await supabase
        .from('fragment_themes')
        .select(`
          theme_code,
          similarity,
          knowledge_fragments!inner(
            id,
            text,
            source,
            interpreter
          )
        `)
        .eq('theme_code', theme.code)
        .eq('knowledge_fragments.interpreter', 'lakshmi') // Only Lakshmi content
        .order('similarity', { ascending: false })
        .limit(3);
      
      if (!fragmentError && fragments && fragments.length > 0) {
        themeFragments.push({
          theme,
          fragments: fragments.map(f => ({
            id: f.knowledge_fragments.id,
            text: f.knowledge_fragments.text,
            source: f.knowledge_fragments.source,
            similarity: f.similarity
          }))
        });
      }
    }
  }
  
  // Step 3: Also get direct fragment matches for comparison
  const { data: directFragments, error: directError } = await supabase.rpc('search_fragments', {
    query_embedding: dreamEmbedding,
    similarity_threshold: 0.35,
    max_results: 5
  }).eq('interpreter', 'lakshmi'); // This might need adjustment based on function
  
  console.log(`   Found ${directFragments?.length || 0} direct fragment matches`);
  
  return {
    dream,
    themes: themes || [],
    themeFragments,
    directFragments: directFragments || []
  };
}

async function main() {
  console.log('🧪 Lakshmi RAG System Test\n');
  console.log('Testing with 5 natural dreams...');
  
  const results = {
    test_date: new Date().toISOString(),
    interpreter: 'lakshmi',
    dream_count: testDreams.length,
    dreams: testDreams,
    analysis_results: [] as any[]
  };
  
  // Analyze each dream
  for (const dream of testDreams) {
    const analysis = await analyzeDream(dream);
    if (analysis) {
      results.analysis_results.push(analysis);
    }
  }
  
  // Save results
  const outputPath = path.join(process.cwd(), `lakshmi-rag-test-${Date.now()}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  
  console.log(`\n✅ Test complete! Results saved to: ${outputPath}`);
  
  // Show summary
  const avgThemeMatch = results.analysis_results.reduce((acc, r) => 
    acc + (r.themes[0]?.similarity || 0), 0) / results.analysis_results.length;
  
  const totalFragments = results.analysis_results.reduce((acc, r) => 
    acc + r.themeFragments.reduce((acc2: number, tf: any) => acc2 + tf.fragments.length, 0), 0);
  
  console.log('\n📊 Summary:');
  console.log(`   Average theme match: ${(avgThemeMatch * 100).toFixed(1)}%`);
  console.log(`   Total Lakshmi fragments retrieved: ${totalFragments}`);
  console.log(`   Interpreter: Lakshmi (New Age)`);
  
  // Show sample results
  if (results.analysis_results.length > 0) {
    const sample = results.analysis_results[0];
    console.log(`\n📝 Sample results for "${sample.dream.title}":\n`);
    
    console.log('Top 3 themes:');
    sample.themes.slice(0, 3).forEach((t: any, i: number) => {
      console.log(`   ${i + 1}. ${t.code} - ${t.label} (${(t.similarity * 100).toFixed(1)}%)`);
    });
    
    if (sample.themeFragments.length > 0) {
      console.log('\nSample Lakshmi interpretations:');
      sample.themeFragments.slice(0, 2).forEach((tf: any) => {
        console.log(`\n   Theme: ${tf.theme.label}`);
        if (tf.fragments.length > 0) {
          console.log(`   "${tf.fragments[0].text.substring(0, 200)}..."`);
          console.log(`   Source: ${tf.fragments[0].source}`);
        }
      });
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}