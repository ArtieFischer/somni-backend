#!/usr/bin/env node
/**
 * Test complete RAG system for Mary interpreter
 * Tests dream → theme → fragment flow with neuroscience content
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

// Test dreams focused on neuroscience-relevant scenarios
const testDreams = [
  {
    id: 'dream_1',
    title: 'Memory Consolidation Dream',
    content: `I was in a library where books kept rearranging themselves on the shelves. I was trying to study for an important exam, but every time I read a page, the words would change. I kept seeing formulas and facts from my physics class mixed with childhood memories. My grandmother appeared and started teaching me the material, even though she never studied physics. The information finally started making sense when I began teaching it to other students in the dream.`
  },
  {
    id: 'dream_2', 
    title: 'REM Sleep Paralysis',
    content: `I woke up in my bed but couldn't move my body at all. I could see my room clearly but felt a heavy pressure on my chest. There was a dark figure standing in the corner of my room watching me. I tried to scream but no sound came out. My heart was racing and I was breathing rapidly. After what felt like hours but was probably minutes, I suddenly could move again and the figure vanished.`
  },
  {
    id: 'dream_3',
    title: 'Problem-Solving Dream',
    content: `I was working on a complex coding problem that I couldn't solve during the day. In the dream, the code appeared as colorful blocks that I could physically move around. I discovered that two functions were interfering with each other when I saw them as tangled ropes. By untangling them and reorganizing the structure, the solution became obvious. When I woke up, I immediately knew how to fix the bug.`
  },
  {
    id: 'dream_4',
    title: 'Emotional Processing Dream',
    content: `I was at my father's funeral again, even though he passed away five years ago. But this time, instead of being sad, we were having a celebration of his life. He was there too, laughing and telling stories. I got to tell him all the things I never said while he was alive. We hugged and he told me he was proud of me. I woke up feeling peaceful instead of the usual grief.`
  },
  {
    id: 'dream_5',
    title: 'Sleep Deprivation Dream',
    content: `Everything in the dream was fragmented and chaotic. I kept microsleeping while driving and suddenly finding myself in different locations. One moment I was at work, the next in my childhood home. People's faces kept morphing into other people. I was extremely tired in the dream and kept trying to find a place to sleep but every bed disappeared when I approached it. Time moved in strange jumps and loops.`
  },
  {
    id: 'dream_6',
    title: 'Lucid Dream Experience',
    content: `I was walking through my neighborhood when I noticed the street signs were all gibberish. That's when I realized I was dreaming. I decided to test my dream control by making myself fly. At first I could only jump high, but then I focused and lifted off the ground. I flew to the clouds and changed the weather from sunny to snowy with just a thought. I practiced creating objects out of thin air and even changed the color of the sky to purple.`
  },
  {
    id: 'dream_7',
    title: 'Memory and Learning',
    content: `I was back in medical school but all my knowledge from years of practice was intact. During a lecture, I could see the neural pathways lighting up in a 3D brain model as the professor explained concepts. Information was literally flowing into my brain like streams of light. I understood complex topics instantly that took me weeks to learn originally. Other students started asking me questions and I was teaching them using vivid mental models.`
  },
  {
    id: 'dream_8',
    title: 'Circadian Rhythm Dream',
    content: `The sun and moon were racing across the sky at incredible speed. Day and night cycled every few minutes. My body felt confused, alternately exhausted and wide awake. I was trying to maintain a normal schedule but meals appeared at random times and clocks showed different times in each room. My bedroom kept shifting between morning brightness and midnight darkness. I felt jet-lagged and disoriented throughout the entire dream.`
  }
];

async function analyzeDream(dream: typeof testDreams[0]) {
  console.log(`\n🧠 Analyzing: "${dream.title}"`);
  
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
  
  // Debug: Check theme structure
  if (themes && themes.length > 0) {
    console.log(`   Theme structure: ${Object.keys(themes[0]).join(', ')}`);
  }
  
  // Step 2: Find Mary fragments for these themes
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
            interpreter,
            metadata
          )
        `)
        .eq('theme_code', theme.code)
        .eq('knowledge_fragments.interpreter', 'mary') // Only Mary content
        .order('similarity', { ascending: false })
        .limit(3);
      
      if (!fragmentError && fragments && fragments.length > 0) {
        themeFragments.push({
          theme: {
            ...theme,
            // Ensure we have the theme name
            name: theme.name || theme.theme_name || theme.code
          },
          fragments: fragments.map(f => ({
            id: f.knowledge_fragments.id,
            text: f.knowledge_fragments.text,
            source: f.knowledge_fragments.source,
            similarity: f.similarity,
            metadata: f.knowledge_fragments.metadata
          }))
        });
      }
    }
  }
  
  // Step 3: Calculate relevance scores
  const allFragments = themeFragments.flatMap(tf => 
    tf.fragments.map(f => ({
      ...f,
      theme_code: tf.theme.code || tf.theme.theme_code,
      theme_name: tf.theme.name || tf.theme.theme_name || tf.theme.code || 'Unknown',
      theme_similarity: tf.theme.similarity,
      combined_score: tf.theme.similarity * f.similarity
    }))
  );
  
  // Sort by combined score and get top 5 unique fragments
  const uniqueFragments = Array.from(
    new Map(allFragments.map(f => [f.id, f])).values()
  ).sort((a, b) => b.combined_score - a.combined_score).slice(0, 5);
  
  // Display results
  console.log(`\n   📚 Top Neuroscience Insights:`);
  
  uniqueFragments.forEach((fragment, idx) => {
    console.log(`\n   ${idx + 1}. Source: ${fragment.source}`);
    console.log(`      Theme: ${fragment.theme_name || 'N/A'} (${(fragment.theme_similarity * 100).toFixed(1)}%)`);
    console.log(`      Relevance: ${(fragment.combined_score * 100).toFixed(1)}%`);
    console.log(`      Excerpt: ${fragment.text.substring(0, 150)}...`);
  });
  
  const result = {
    dream,
    themes: themes?.slice(0, 5) || [],
    fragments: uniqueFragments,
    fullResults: {
      dreamContent: dream.content,
      allThemes: themes || [],
      fragmentsWithFullText: uniqueFragments.map(f => ({
        ...f,
        fullText: f.text
      }))
    }
  };
  
  // Debug logging
  console.log(`   Debug: Returning ${result.fragments.length} fragments for analysis`);
  
  return result;
}

async function generateReport(results: any[]) {
  const detailedReport = {
    timestamp: new Date().toISOString(),
    interpreter: 'mary',
    totalDreams: results.length,
    summary: {
      totalFragmentsRetrieved: results.reduce((acc, r) => acc + r.fragments.length, 0),
      averageFragmentsPerDream: results.reduce((acc, r) => acc + r.fragments.length, 0) / results.length,
      uniqueSources: [...new Set(results.flatMap(r => r.fragments.map((f: any) => f.source)))]
    },
    dreamAnalyses: results.map(r => ({
      dreamId: r.dream.id,
      dreamTitle: r.dream.title,
      dreamContent: r.dream.content,
      matchedThemes: r.themes?.map((t: any) => ({
        code: t.code,
        name: t.name || t.theme_name || 'Unknown Theme',
        similarity: t.similarity,
        description: t.description || null
      })) || [],
      retrievedFragments: r.fragments.map((f: any) => ({
        fragmentId: f.id,
        source: f.source,
        themeCode: f.theme_code,
        themeName: f.theme_name || 'Unknown Theme',
        themeSimilarity: f.theme_similarity,
        fragmentSimilarity: f.similarity,
        combinedRelevance: f.combined_score,
        fullText: f.text,
        metadata: f.metadata
      })),
      metrics: {
        fragmentsFound: r.fragments.length,
        averageRelevance: r.fragments.length > 0 
          ? r.fragments.reduce((acc: number, f: any) => acc + f.combined_score, 0) / r.fragments.length 
          : 0,
        topSources: [...new Set(r.fragments.map((f: any) => f.source))]
      }
    }))
  };
  
  // Save detailed report
  const reportPath = path.join(process.cwd(), `mary-rag-test-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(detailedReport, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  
  // Also save a compact summary
  const summaryPath = path.join(process.cwd(), `mary-rag-test-summary-${Date.now()}.json`);
  const summary = {
    timestamp: detailedReport.timestamp,
    interpreter: 'mary',
    summary: detailedReport.summary,
    dreamResults: detailedReport.dreamAnalyses.map(d => ({
      dream: d.dreamTitle,
      themesMatched: d.matchedThemes.length,
      fragmentsRetrieved: d.metrics.fragmentsFound,
      averageRelevance: (d.metrics.averageRelevance * 100).toFixed(1) + '%',
      topTheme: d.matchedThemes[0]?.name || 'None',
      topSource: d.metrics.topSources[0] || 'None'
    }))
  };
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`📊 Summary saved to: ${summaryPath}`);
  
  return detailedReport;
}

async function testRetrievalQuality() {
  console.log('\n🔬 Testing Neuroscience-Specific Retrieval Quality\n');
  
  const neuroscientificConcepts = [
    'REM sleep and memory consolidation',
    'hippocampus role in dreams',
    'amygdala emotional processing',
    'sleep deprivation effects',
    'circadian rhythm disruption',
    'dream creativity and problem solving',
    'neurotransmitters during sleep',
    'brain waves in different sleep stages'
  ];
  
  for (const concept of neuroscientificConcepts) {
    console.log(`\n🔍 Testing concept: "${concept}"`);
    
    const embedding = await bgeEmbeddingsService.generateEmbedding(concept);
    
    // Find matching themes first
    const { data: themes, error: themeError } = await supabase.rpc('search_themes', {
      query_embedding: embedding,
      similarity_threshold: 0.4,
      max_results: 3
    });
    
    if (themeError || !themes || themes.length === 0) {
      console.log(`   ❌ No matching themes found`);
      continue;
    }
    
    // Find Mary fragments for the top theme
    const { data: fragments, error: fragmentError } = await supabase
      .from('fragment_themes')
      .select(`
        similarity,
        knowledge_fragments!inner(
          id,
          text,
          source,
          interpreter
        )
      `)
      .eq('theme_code', themes[0].code)
      .eq('knowledge_fragments.interpreter', 'mary')
      .order('similarity', { ascending: false })
      .limit(3);
    
    if (!fragmentError && fragments && fragments.length > 0) {
      console.log(`   ✅ Found ${fragments.length} relevant fragments via theme: ${themes[0].name}`);
      console.log(`   Top match: ${fragments[0].knowledge_fragments.text.substring(0, 100)}...`);
      console.log(`   Theme similarity: ${(themes[0].similarity * 100).toFixed(1)}%`);
    } else {
      console.log(`   ⚠️  Theme found (${themes[0].name}) but no Mary fragments linked`);
    }
  }
}

async function main() {
  console.log('🧪 Mary RAG System Test\n');
  console.log('Testing neuroscience knowledge retrieval through dream analysis...\n');
  
  try {
    // Initialize BGE service
    await bgeEmbeddingsService.initialize();
    console.log('✓ BGE service initialized\n');
    
    // Verify Mary data exists
    const { count: maryCount } = await supabase
      .from('knowledge_fragments')
      .select('*', { count: 'exact', head: true })
      .eq('interpreter', 'mary');
    
    console.log(`📊 Mary fragments in database: ${maryCount}\n`);
    
    if (!maryCount || maryCount === 0) {
      console.error('❌ No Mary fragments found. Please run ingestion first.');
      return;
    }
    
    // Test each dream
    const results = [];
    for (const dream of testDreams) {
      const result = await analyzeDream(dream);
      if (result) {
        results.push(result);
        console.log(`\n   ✅ Completed analysis for "${dream.title}"`);
        console.log(`      Themes found: ${result.themes?.length || 0}`);
        console.log(`      Fragments retrieved: ${result.fragments?.length || 0}`);
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`\n📊 Generating reports from ${results.length} dream analyses...`);
    
    // Generate report
    const report = await generateReport(results);
    
    // Log summary
    console.log(`\n📈 Test Summary:`);
    console.log(`   Total fragments retrieved: ${report.summary.totalFragmentsRetrieved}`);
    console.log(`   Average fragments per dream: ${report.summary.averageFragmentsPerDream.toFixed(1)}`);
    
    // Test retrieval quality
    await testRetrievalQuality();
    
    console.log('\n✅ Test complete!');
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}