#!/usr/bin/env node
/**
 * Complete RAG system test with natural dreams
 * Tests theme matching and fragment retrieval
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

// Natural, everyday dreams (not Jung-biased)
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

interface DreamAnalysis {
  dream_id: string;
  dream_title: string;
  top_themes: Array<{
    code: string;
    label: string;
    similarity: number;
    top_fragments: Array<{
      id: string;
      text: string;
      source: string;
      similarity: number;
    }>;
  }>;
  top_fragments_direct: Array<{
    id: string;
    text: string;
    source: string;
    similarity: number;
    matched_themes: string[];
  }>;
}

async function analyzeDream(dream: typeof testDreams[0]): Promise<DreamAnalysis> {
  console.log(`\n🔮 Analyzing: "${dream.title}"`);
  
  // Generate embedding for dream
  const dreamEmbedding = await bgeEmbeddingsService.generateEmbedding(dream.content);
  
  // 1. Get top 10 themes for this dream
  const { data: topThemes } = await supabase.rpc('search_themes', {
    query_embedding: dreamEmbedding,
    similarity_threshold: 0.0, // Get all, we'll take top 10
    max_results: 10
  });
  
  console.log(`   Found ${topThemes?.length || 0} matching themes`);
  
  // 2. Get top 5 fragments directly matching the dream
  const { data: directFragments } = await supabase.rpc('search_fragments', {
    query_embedding: dreamEmbedding,
    similarity_threshold: 0.0,
    max_results: 5
  });
  
  console.log(`   Found ${directFragments?.length || 0} direct fragment matches`);
  
  // 3. For each theme, get top 3 fragments
  const themesWithFragments = [];
  for (const theme of topThemes || []) {
    const { data: themeFragments } = await supabase.rpc('search_fragments_by_theme', {
      theme_code_param: theme.code,
      similarity_threshold: 0.0,
      max_results: 3
    });
    
    themesWithFragments.push({
      code: theme.code,
      label: theme.label,
      similarity: theme.similarity,
      top_fragments: themeFragments?.map(f => ({
        id: f.id,
        text: f.text,  // Full text, no trimming
        source: f.source,
        similarity: f.similarity
      })) || []
    });
  }
  
  // 4. Get matched themes for direct fragments
  const directFragmentsWithThemes = [];
  for (const fragment of directFragments || []) {
    const { data: fragmentThemes } = await supabase
      .from('fragment_themes')
      .select('theme_code, themes!inner(label)')
      .eq('fragment_id', fragment.id)
      .order('similarity', { ascending: false })
      .limit(5);
    
    directFragmentsWithThemes.push({
      id: fragment.id,
      text: fragment.text,  // Full text, no trimming
      source: fragment.source,
      similarity: fragment.similarity,
      matched_themes: fragmentThemes?.map(ft => ft.theme_code) || []
    });
  }
  
  return {
    dream_id: dream.id,
    dream_title: dream.title,
    top_themes: themesWithFragments,
    top_fragments_direct: directFragmentsWithThemes
  };
}

async function main() {
  console.log('🧪 Complete RAG System Test\n');
  console.log('Testing with 5 natural dreams...');
  
  const results: DreamAnalysis[] = [];
  
  for (const dream of testDreams) {
    const analysis = await analyzeDream(dream);
    results.push(analysis);
  }
  
  // Save results to JSON
  const output = {
    test_date: new Date().toISOString(),
    dream_count: testDreams.length,
    dreams: testDreams,
    analysis_results: results,
    statistics: {
      avg_theme_similarity: results.reduce((sum, r) => 
        sum + r.top_themes.reduce((s, t) => s + t.similarity, 0) / r.top_themes.length, 0
      ) / results.length,
      avg_fragment_similarity: results.reduce((sum, r) => 
        sum + r.top_fragments_direct.reduce((s, f) => s + f.similarity, 0) / r.top_fragments_direct.length, 0
      ) / results.length,
      total_fragments_retrieved: results.reduce((sum, r) => 
        sum + r.top_fragments_direct.length + r.top_themes.reduce((s, t) => s + t.top_fragments.length, 0), 0
      )
    }
  };
  
  const outputPath = path.join(process.cwd(), `rag-test-results-${Date.now()}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  
  console.log(`\n✅ Test complete! Results saved to: ${outputPath}`);
  
  // Print summary
  console.log('\n📊 Summary:');
  console.log(`   Average theme match: ${(output.statistics.avg_theme_similarity * 100).toFixed(1)}%`);
  console.log(`   Average fragment match: ${(output.statistics.avg_fragment_similarity * 100).toFixed(1)}%`);
  console.log(`   Total fragments retrieved: ${output.statistics.total_fragments_retrieved}`);
  
  // Show sample results for first dream
  console.log(`\n📝 Sample results for "${testDreams[0].title}":`);
  const firstResult = results[0];
  console.log('\nTop 3 themes:');
  firstResult.top_themes.slice(0, 3).forEach((theme, i) => {
    console.log(`   ${i + 1}. ${theme.code} - ${theme.label} (${(theme.similarity * 100).toFixed(1)}%)`);
  });
  
  console.log('\nTop 3 direct fragment matches:');
  firstResult.top_fragments_direct.slice(0, 3).forEach((frag, i) => {
    console.log(`   ${i + 1}. "${frag.text.substring(0, 150)}..." (${(frag.similarity * 100).toFixed(1)}%)`);
    console.log(`      Source: ${frag.source}`);
    console.log(`      Themes: ${frag.matched_themes.join(', ')}`);
  });
}

// SQL functions needed
const requiredFunctions = `
-- Make sure these functions exist in your database:

-- 1. search_themes (should already exist)
-- 2. search_fragments (should already exist)
-- 3. search_fragments_by_theme (should already exist)

-- If not, check the migration files in supabase/migrations/
`;

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('📝 Required SQL functions:');
  console.log(requiredFunctions);
  console.log('\nStarting test in 3 seconds...\n');
  
  setTimeout(() => {
    main().catch(console.error);
  }, 3000);
}