import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';
import { RAGService } from '../services/rag.service.js';
import { FreudianRAGPromptBuilder } from '../prompts/interpreters/freud/builder-with-rag.js';
import type { DreamAnalysisRequest } from '../prompts/base.js';

async function testFreudRAG() {
  console.log('🧠 Testing Freud RAG Implementation...\n');

  // Create supabase client
  const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);
  const ragService = new RAGService(supabase);
  
  // Test scenarios for different Freudian themes
  const testScenarios = [
    {
      name: "Trauma and Repetition",
      dream: `I keep having the same nightmare about being in a war zone. 
              I'm running through destroyed buildings, hearing explosions, 
              and I can't find my way out. I wake up in panic every time.`,
      expectedFilter: { topic: { $in: ['dream', 'metapsych'] } },
      expectedBoost: ['trauma', 'repetition', 'death_drive', 'anxiety']
    },
    {
      name: "Oedipal/Family Dynamics",
      dream: `I dreamed I was arguing with my father about my mother. 
              He was very angry and I felt guilty but also defiant. 
              My mother appeared and sided with me, which made things worse.`,
      expectedFilter: { topic: { $in: ['dream', 'case'] } },
      expectedBoost: ['oedipus', 'family', 'child']
    },
    {
      name: "Sexual/Libidinal Content",
      dream: `I was in a bedroom with someone I'm attracted to. 
              We were about to be intimate but then the room filled with water 
              and I couldn't breathe. I woke up feeling frustrated.`,
      expectedFilter: { topic: { $in: ['dream', 'metapsych'] } },
      expectedBoost: ['libido', 'psychosexual', 'wish']
    },
    {
      name: "Anxiety and Defense",
      dream: `I'm in an exam but I haven't studied. Everyone else is writing 
              but my pen won't work. I try to hide my paper so no one sees 
              I haven't written anything. The teacher is approaching.`,
      expectedFilter: { topic: { $in: ['dream', 'metapsych'] } },
      expectedBoost: ['anxiety', 'defence', 'repression']
    },
    {
      name: "Slips and Forgetting",
      dream: `I meant to call my ex-girlfriend but accidentally called my mother instead. 
              In the dream I kept making these mistakes, saying the wrong names, 
              forgetting important appointments.`,
      expectedFilter: { topic: { $in: ['dream', 'ancillary'] } },
      expectedBoost: ['slip', 'forgetting']
    }
  ];

  // Test each scenario
  for (const scenario of testScenarios) {
    console.log(`\n📋 Testing: ${scenario.name}`);
    console.log(`Dream: "${scenario.dream.substring(0, 100)}..."`);
    
    try {
      // Build request
      const request: DreamAnalysisRequest = {
        interpreterType: 'freud',
        dreamTranscription: scenario.dream,
        analysisDepth: 'deep',
        userContext: {
          age: 35,
          emotionalState: 'anxious',
          currentLifeSituation: 'work stress'
        }
      };
      
      // Test with FreudianRAGPromptBuilder
      const builder = new FreudianRAGPromptBuilder();
      await builder.buildPromptAsync(request);
      const ragContext = builder.getLastRetrievedContext();
      
      // Display results
      console.log(`\n✅ Successfully built prompt with RAG enhancement`);
      console.log(`Filter used: ${JSON.stringify(ragContext?.filter || {})}`);
      console.log(`Boost config: ${JSON.stringify(ragContext?.boost || {})}`);
      console.log(`Retrieved ${ragContext?.passages?.length || 0} passages`);
      
      if (ragContext?.passages?.length > 0) {
        console.log('\nSample passages:');
        ragContext.passages.slice(0, 2).forEach((p: any, i: number) => {
          console.log(`${i + 1}. From "${p.source}" [${p.topic}/${p.subtopic?.join(',')}]`);
          console.log(`   "${p.content.substring(0, 150)}..."`);
          console.log(`   Relevance: ${(p.relevance * 100).toFixed(1)}%`);
        });
      }
      
      // Verify filtering worked as expected
      const filterMatch = JSON.stringify(ragContext?.filter) === JSON.stringify(scenario.expectedFilter);
      console.log(`\n${filterMatch ? '✅' : '❌'} Filter matches expected`);
      
      // Test direct RAG service call
      console.log('\n🔍 Testing direct RAG service call...');
      const directContext = await ragService.getRelevantContext(
        scenario.dream,
        'freud',
        {
          maxResults: 5,
          similarityThreshold: 0.65,
          where: scenario.expectedFilter,
          boost: { subtopic: scenario.expectedBoost }
        }
      );
      
      console.log(`Direct RAG call returned ${directContext.relevantPassages.length} passages`);
      
    } catch (error) {
      console.error(`❌ Error testing ${scenario.name}:`, error);
    }
  }
  
  console.log('\n\n✅ Freud RAG testing complete!');
}

// Run the test
testFreudRAG().catch(console.error);