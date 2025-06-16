import { DreamInterpretationService } from '../prompts/service';
import type { InterpretationRequest } from '../types';

// Temporarily override feature flag
const originalEnv = process.env['ENABLE_RAG'];

async function compareInterpretations() {
  const dreamRequest: InterpretationRequest = {
    dreamId: 'test-comparison',
    dreamTranscription: `I found myself in an ancient library filled with books that 
    glowed with inner light. As I touched one, I transformed into a wise serpent 
    and could understand the language of symbols. My shadow appeared as a guide, 
    leading me deeper into the labyrinth of knowledge.`,
    interpreterType: 'jung',
    analysisDepth: 'deep',
    userContext: {
      age: 35
    }
  };

  const interpretationService = new DreamInterpretationService();

  console.log('🌙 Dream:', dreamRequest.dreamTranscription);
  console.log('\n' + '='.repeat(80) + '\n');

  try {
    // Test without RAG
    console.log('📖 INTERPRETATION WITHOUT RAG:\n');
    process.env['ENABLE_RAG'] = 'false';
    
    // Clear module cache to force re-evaluation of feature flag
    delete require.cache[require.resolve('../config/features')];
    delete require.cache[require.resolve('../prompts/factory')];
    
    const withoutRAG = await interpretationService.interpretDream(dreamRequest);
    
    if (withoutRAG.success && withoutRAG.interpretation) {
      const interp = withoutRAG.interpretation;
      // Check if it's the new JungianInsights format
      if ('type' in interp && interp.type === 'jungian') {
        console.log(interp.phenomenologicalOpening);
        console.log('\nCore Message:', interp.coreMessage);
        console.log('\nSymbols:', interp.symbols.join(', '));
      } else if ('dreamTopic' in interp) {
        // Old DreamAnalysis format
        console.log(interp.interpretation);
        console.log('\nSymbols:', interp.symbols.join(', '));
      }
    } else {
      console.log('Failed to generate interpretation');
    }

    console.log('\n' + '='.repeat(80) + '\n');

    // Test with RAG
    console.log('📚 INTERPRETATION WITH RAG (Enhanced with Jung\'s texts):\n');
    process.env['ENABLE_RAG'] = 'true';
    
    // Clear module cache again
    delete require.cache[require.resolve('../config/features')];
    delete require.cache[require.resolve('../prompts/factory')];
    
    const withRAG = await interpretationService.interpretDream(dreamRequest);
    
    if (withRAG.success && withRAG.interpretation) {
      const interp = withRAG.interpretation;
      // Check if it's the new JungianInsights format
      if ('type' in interp && interp.type === 'jungian') {
        console.log(interp.phenomenologicalOpening);
        console.log('\nCore Message:', interp.coreMessage);
        console.log('\nSymbols:', interp.symbols.join(', '));
        console.log('\nIndividuation Guidance:', interp.individuationGuidance);
        
        // The presence of Jung-specific references would indicate RAG usage
        if (interp.interpretation.includes('From') || interp.interpretation.includes('Jung')) {
          console.log('\n✅ RAG Context appears to have been used');
        }
      } else if ('dreamTopic' in interp) {
        // Old DreamAnalysis format
        console.log(interp.interpretation);
        console.log('\nSymbols:', interp.symbols.join(', '));
        
        // Check the raw response for RAG indicators
        if (withRAG.aiResponse && (withRAG.aiResponse.includes('From') || withRAG.aiResponse.includes('Jung'))) {
          console.log('\n✅ RAG Context appears to have been used');
        }
      }
    } else {
      console.log('Failed to generate interpretation');
    }

  } catch (error) {
    console.error('Error:', error);
  }

  // Restore original env
  process.env['ENABLE_RAG'] = originalEnv;
  process.exit(0);
}

compareInterpretations();