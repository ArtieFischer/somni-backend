import { MaryRAGPromptBuilder } from '../../prompts/interpreters/mary/builder-with-rag';
import type { DreamAnalysisRequest } from '../../prompts/base';
// import { logger } from '../../utils/logger';

/**
 * Test Mary's RAG integration with various dream scenarios
 */
async function testMaryRAG() {
  console.log('Testing Mary RAG integration...\n');

  const builder = new MaryRAGPromptBuilder();

  const testCases: DreamAnalysisRequest[] = [
    {
      dreamTranscription: "I was in a laboratory conducting an experiment. The equipment kept changing and morphing. Suddenly I realized I was the experiment and woke up startled.",
      interpreterType: 'mary',
      analysisDepth: 'deep',
      userContext: {
        age: 28,
        emotionalState: "curious but anxious",
        currentLifeSituation: "Starting PhD program"
      }
    },
    {
      dreamTranscription: "I keep having the same dream where I'm trying to study for an exam but can't remember anything. The words in my textbook keep changing.",
      interpreterType: 'mary',
      analysisDepth: 'deep',
      userContext: {
        age: 22,
        emotionalState: "stressed",
        recentMajorEvents: ["Final exams approaching"]
      }
    },
    {
      dreamTranscription: "I was flying through colorful neural networks, watching thoughts form as sparkles of light. It felt incredibly peaceful and I didn't want to wake up.",
      interpreterType: 'mary',
      analysisDepth: 'transformative',
      userContext: {
        age: 45,
        emotionalState: "contemplative",
        currentLifeSituation: "Practicing meditation regularly"
      }
    }
  ];

  for (let i = 0; i < testCases.length; i++) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Test Case ${i + 1}: ${testCases[i]?.dreamTranscription.substring(0, 50)}...`);
    console.log(`${'='.repeat(80)}\n`);

    try {
      const prompt = await builder.buildPromptAsync(testCases[i]!);
      const ragContext = builder.getLastRetrievedContext();

      console.log('RAG Context Retrieved:');
      console.log('-'.repeat(40));
      
      if (ragContext?.passages && ragContext.passages.length > 0) {
        console.log(`Found ${ragContext.passages.length} relevant passages:`);
        
        ragContext.passages.forEach((passage: any, idx: number) => {
          console.log(`\n[${idx + 1}] Source: ${passage.metadata?.source || 'Unknown'}`);
          if (passage.metadata?.chapter) {
            console.log(`    Chapter: ${passage.metadata.chapter}`);
          }
          console.log(`    Relevance Score: ${passage.similarity?.toFixed(3) || 'N/A'}`);
          console.log(`    Subtopics: ${passage.metadata?.subtopic?.join(', ') || 'None'}`);
          console.log(`    Preview: "${passage.content.substring(0, 150)}..."`);
        });
      } else {
        console.log('No RAG passages retrieved');
      }

      console.log('\n' + '-'.repeat(40));
      console.log('Prompt Output Format (first 500 chars):');
      console.log(prompt.outputFormat.substring(0, 500) + '...');

    } catch (error) {
      console.error('Error:', error);
    }
  }
}

// Execute test
if (require.main === module) {
  testMaryRAG()
    .then(() => {
      console.log('\n✅ Mary RAG test complete');
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}