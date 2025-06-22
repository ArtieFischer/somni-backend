#!/usr/bin/env node
/**
 * Test Dream Theme Analysis with BGE-M3 Embeddings
 * Tests the new 1024D theme embeddings against sample dream transcriptions
 */

import { createClient } from '@supabase/supabase-js';
import { bgeEmbeddingsService } from '../services/embeddings-bge.service.js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Sample dream transcriptions for testing
const sampleDreams = [
  {
    id: 1,
    title: "Flying Over Water",
    transcript: "I was flying over a vast ocean, feeling completely free and weightless. The water below was crystal clear and I could see schools of fish swimming beneath me. I felt no fear, only pure joy and liberation. The sky was endless and blue."
  },
  {
    id: 2,
    title: "Lost in School",
    transcript: "I was back in my old high school but couldn't find my classroom. The hallways kept changing and I was late for an important exam. I felt anxious and confused, running through corridors that seemed to stretch forever. Other students were staring at me."
  },
  {
    id: 3,
    title: "Talking to Deceased Grandmother",
    transcript: "My grandmother, who passed away years ago, was sitting in her old kitchen. She was baking cookies and smiled at me warmly. We talked about family memories and she gave me advice about a current problem I'm facing. I felt comforted and loved."
  },
  {
    id: 4,
    title: "Chase by Shadow Figure",
    transcript: "A dark shadowy figure was chasing me through a forest at night. I couldn't see its face but felt overwhelming dread. I kept running but the trees seemed to close in around me. I woke up with my heart pounding and covered in sweat."
  },
  {
    id: 5,
    title: "House Transformation",
    transcript: "I was in my childhood home but it kept changing. Rooms would appear and disappear, walls would shift, and furniture would morph into different objects. I felt both curious and unsettled by these constant transformations."
  }
];

async function analyzeDreamThemes() {
  console.log('🌙 Starting Dream Theme Analysis Test\n');

  for (const dream of sampleDreams) {
    console.log(`\n📖 Analyzing: "${dream.title}"`);
    console.log(`Dream: ${dream.transcript.substring(0, 100)}...`);

    try {
      // Generate embedding for dream transcript
      const dreamEmbedding = await bgeEmbeddingsService.generateEmbedding(dream.transcript);
      
      if (!dreamEmbedding || dreamEmbedding.length !== 1024) {
        throw new Error(`Invalid embedding: expected 1024 dimensions, got ${dreamEmbedding?.length || 0}`);
      }

      // Find most relevant themes using cosine similarity
      const { data: themes, error } = await supabase
        .rpc('search_themes', {
          query_embedding: dreamEmbedding,
          similarity_threshold: 0.1,
          max_results: 8
        });

      if (error) {
        throw error;
      }

      console.log(`\n🎯 Top Themes Found (${themes?.length || 0} matches):`);
      
      if (themes && themes.length > 0) {
        themes.forEach((theme: any, index: number) => {
          const percentage = (theme.score * 100).toFixed(1);
          console.log(`   ${index + 1}. ${theme.code}: ${theme.label} (${percentage}% match)`);
        });
      } else {
        console.log('   No themes found above similarity threshold');
      }

      // Also test direct SQL query for comparison
      const { data: directResults, error: directError } = await supabase
        .from('themes')
        .select('code, label, embedding')
        .not('embedding', 'is', null)
        .limit(5);

      if (!directError && directResults && directResults.length > 0) {
        console.log(`\n📊 Manual similarity check with first 5 themes:`);
        
        for (const theme of directResults.slice(0, 3)) {
          // Calculate cosine similarity manually
          const { data: similarity } = await supabase
            .rpc('vector_cosine_similarity', {
              vec1: dreamEmbedding,
              vec2: theme.embedding
            });
          
          if (similarity !== null) {
            console.log(`   ${theme.code}: ${(similarity * 100).toFixed(1)}% similarity`);
          }
        }
      }

    } catch (error) {
      console.error(`❌ Error analyzing dream "${dream.title}":`, error.message);
    }

    console.log('\n' + '─'.repeat(60));
  }

  // Test search function availability
  console.log('\n🔍 Testing search_themes function...');
  try {
    const testEmbedding = new Array(1024).fill(0.001);
    const { data, error } = await supabase
      .rpc('search_themes', {
        query_embedding: testEmbedding,
        similarity_threshold: 0.0,
        max_results: 3
      });

    if (error) {
      console.error('❌ search_themes function error:', error.message);
    } else {
      console.log(`✅ search_themes function working (returned ${data?.length || 0} results)`);
    }
  } catch (error) {
    console.error('❌ search_themes test failed:', error.message);
  }

  // Check index status
  console.log('\n📈 Checking index status...');
  try {
    const { data: indexes } = await supabase
      .from('pg_indexes')
      .select('indexname, indexdef')
      .eq('tablename', 'themes')
      .like('indexname', '%embedding%');

    if (indexes && indexes.length > 0) {
      console.log('✅ Found embedding indexes:');
      indexes.forEach(idx => {
        console.log(`   ${idx.indexname}`);
      });
    } else {
      console.log('⚠️  No embedding indexes found');
    }
  } catch (error) {
    console.log('⚠️  Could not check index status:', error.message);
  }

  console.log('\n🎉 Dream theme analysis test completed!');
}

// Helper function to create cosine similarity RPC if it doesn't exist
async function ensureCosineSimilarityFunction() {
  try {
    await supabase.rpc('execute_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION vector_cosine_similarity(vec1 vector, vec2 vector)
        RETURNS float
        LANGUAGE plpgsql
        AS $$
        BEGIN
          RETURN 1 - (vec1 <=> vec2);
        END;
        $$;
      `
    });
  } catch (error) {
    // Function might already exist, ignore error
  }
}

async function main() {
  await ensureCosineSimilarityFunction();
  await analyzeDreamThemes();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { analyzeDreamThemes };