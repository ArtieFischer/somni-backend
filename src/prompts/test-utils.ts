import { PromptBuilderService } from './factory';

/**
 * Test utility for prompt builder functionality
 * Provides comprehensive testing of theme extraction and prompt generation
 */
export class PromptBuilderTestUtil {
  
  /**
   * Test universal theme extraction with sample dreams
   */
  static testUniversalThemeExtraction(): void {
    const testDreams = [
      {
        name: 'Flying Dream',
        text: 'I was flying over the ocean, feeling free but also scared of falling. The water was deep blue and endless.'
      },
      {
        name: 'Chase Dream', 
        text: 'A dark figure was chasing me through the forest. I was running as fast as I could but couldn\'t escape.'
      },
      {
        name: 'House Dream',
        text: 'I found myself in my childhood home, but the rooms were different. There was an old wise woman in the attic.'
      },
      {
        name: 'Complex Dream',
        text: 'I was in a vast library that transformed into an ocean. My deceased grandmother appeared as a young woman and handed me a golden key. Then I was flying above my childhood town, but it was underwater. I felt both sad and liberated.'
      },
      {
        name: 'Minimal Dream',
        text: 'I walked to the store.'
      }
    ];

    console.log('\n=== UNIVERSAL THEME EXTRACTION TEST ===\n');

    testDreams.forEach(dream => {
      console.log(`\n🔍 Testing: ${dream.name}`);
      console.log(`📝 Dream: "${dream.text}"\n`);
      
      try {
        const elements = PromptBuilderService.extractUniversalElements(dream.text);
        
        console.log(`✅ Extraction Results:`);
        console.log(`   📊 Emotional Tone: ${elements.emotionalTone}`);
        console.log(`   🏷️  Dream Type: ${elements.dreamType}`);
        console.log(`   🔑 Key Symbols: ${elements.keySymbols.join(', ') || 'none'}`);
        console.log(`   🎭 Characters: ${elements.characters.join(', ') || 'none'}`);
        console.log(`   🏞️  Settings: ${elements.setting.join(', ') || 'none'}`);
        console.log(`   🎬 Actions: ${elements.actions.join(', ') || 'none'}`);
        
        if (elements.detectedThemes.length > 0) {
          console.log(`\n   🎯 Detected Themes (${elements.detectedThemes.length}):`);
          elements.detectedThemes.forEach(theme => {
            console.log(`      • ${theme.theme.name} (${Math.round(theme.relevance * 100)}% relevance)`);
            console.log(`        Category: ${theme.theme.category}`);
            console.log(`        Matches: ${theme.textMatches.join(', ')}`);
          });
        } else {
          console.log(`   🎯 Detected Themes: None`);
        }
        
        // Test symbol extraction for Jung
        console.log(`\n   🔮 Jungian Symbol Extraction:`);
        const symbols = elements.keySymbols.slice(0, 5);
        console.log(`      Simple array: [${symbols.map(s => `"${s}"`).join(', ')}]`);
        
      } catch (error) {
        console.log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      console.log('\n' + '─'.repeat(60));
    });
  }

  /**
   * Test Jung's authentic voice generation
   */
  static testJungianVoice(): void {
    console.log('\n=== JUNGIAN VOICE TEST ===\n');
    
    const testDream = 'I was in a dark forest and met an old wise man who gave me a golden key. Then I found a locked door but was afraid to open it.';
    
    console.log('📝 Test Dream:', testDream);
    console.log('\n🎭 Testing Jung\'s authentic voice patterns:\n');
    
    // Examples of good vs bad Jungian interpretations
    const voiceExamples = [
      {
        bad: 'The forest represents the unconscious mind.',
        good: 'I\'m struck by how you found yourself in that dark forest. At your stage of life, this often means the unconscious is calling you into territory you haven\'t yet explored.'
      },
      {
        bad: 'The wise old man is an archetypal figure.',
        good: 'This wise old man who approached you - what a remarkable encounter! When such a figure offers a golden key, I always pay close attention. Your psyche seems to be offering you something precious.'
      },
      {
        bad: 'Your fear indicates resistance to change.',
        good: 'You mention being afraid to open that door, and I understand completely. We often fear what lies beyond the threshold, don\'t we? Yet the fact that you possess the key suggests you\'re more ready than you know.'
      }
    ];
    
    voiceExamples.forEach((example, i) => {
      console.log(`Example ${i + 1}:`);
      console.log(`   ❌ Generic: "${example.bad}"`);
      console.log(`   ✅ Authentic: "${example.good}"`);
      console.log('');
    });
  }

  /**
   * Test interpretation response parsing
   */
  static testResponseParsing(): void {
    console.log('\n=== RESPONSE PARSING TEST ===\n');
    
    // Simulate different AI response formats
    const testResponses = [
      {
        name: 'Well-formatted JSON',
        response: `{
          "interpretation": "What strikes me immediately about your dream is the profound journey from darkness to potential illumination. I see you navigating that dark forest - a classic representation of entering unknown psychological territory...",
          "symbols": ["forest", "wise man", "golden key", "door", "darkness"],
          "coreInsight": "Your psyche is offering you the key to unlock a new chamber of self-understanding, though you must first face your fear of what lies beyond.",
          "shadowAspect": "The fear of opening the door suggests resistance to embracing new aspects of yourself that are ready to emerge.",
          "guidanceForDreamer": "I encourage you to sit with this dream image. In your waking life, what 'doors' are presenting themselves? What golden keys have you been offered but hesitated to use?",
          "reflectiveQuestion": "What do you imagine lies beyond that locked door that makes you afraid, yet also draws you with such magnetic force?"
        }`
      },
      {
        name: 'Plain text response',
        response: `What a remarkable dream! I'm immediately drawn to the image of you wandering in that dark forest. 

In my experience, when someone finds themselves in a dark forest, especially at your age, it often signals that the psyche is ready for a significant transformation. The darkness isn't something to fear - it's the rich, unknown territory of your own unconscious.

This wise old man who gave you a golden key - now that's fascinating! In all my years of practice, I've found that when such figures appear bearing gifts, they represent the Self offering you something essential for your journey. The golden key, particularly, suggests access to something precious within your own psyche.

Your fear of opening the door is completely understandable. We often hesitate at the threshold of transformation, don't we? Yet consider this: the key was given specifically to you. Your unconscious wouldn't offer what you're not ready to receive.

I wonder - what locked doors in your waking life might this dream be addressing? What new rooms of experience are you being invited to enter?`
      }
    ];
    
    testResponses.forEach(test => {
      console.log(`🧪 Testing: ${test.name}`);
      
      try {
        // Test if response can be parsed
        const jsonMatch = test.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log('   ✅ Successfully parsed as JSON');
          console.log(`   📝 Interpretation length: ${parsed.interpretation?.length || 0} chars`);
          console.log(`   🔮 Symbols: ${parsed.symbols?.join(', ') || 'none'}`);
          console.log(`   💡 Core insight: ${parsed.coreInsight ? 'Present' : 'Missing'}`);
        } else {
          console.log('   ⚠️  No JSON found, would use text extraction');
          console.log(`   📝 Raw response length: ${test.response.length} chars`);
        }
      } catch (error) {
        console.log(`   ❌ Parse error: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
      
      console.log('');
    });
  }

  /**
   * Test prompt length optimization
   */
  static testPromptOptimization(): void {
    console.log('\n=== PROMPT LENGTH OPTIMIZATION TEST ===\n');
    
    const contexts = [
      {
        name: 'Minimal Context',
        request: {
          dreamTranscription: 'I was flying over the ocean.',
          interpreterType: 'jung' as const,
          userContext: { age: 30 },
          analysisDepth: 'initial' as const
        }
      },
      {
        name: 'Rich Context',
        request: {
          dreamTranscription: 'I was flying over the ocean, feeling both free and terrified.',
          interpreterType: 'jung' as const,
          userContext: {
            age: 45,
            currentLifeSituation: 'Going through divorce and career change',
            emotionalState: 'Anxious but hopeful',
            recurringSymbols: ['water', 'flying', 'falling'],
            recentMajorEvents: ['Divorce', 'Job loss', 'Moving back to hometown']
          },
          analysisDepth: 'transformative' as const
        }
      }
    ];
    
    contexts.forEach(async (context) => {
      console.log(`🔧 Testing: ${context.name}`);
      
      try {
        const prompt = await PromptBuilderService.buildInterpretationPrompt(context.request);
        
        console.log(`   ✅ Prompt built successfully`);
        console.log(`   📏 System prompt length: ${prompt.systemPrompt.length} chars`);
        console.log(`   🎯 Analysis depth: ${context.request.analysisDepth}`);
        console.log(`   🧠 Has rich context: ${Object.keys(context.request.userContext || {}).length > 1}`);
        
        // Check for key elements
        const hasPersonalization = prompt.systemPrompt.includes(context.request.userContext?.age?.toString() || '');
        const hasDepthMention = prompt.systemPrompt.includes(context.request.analysisDepth);
        
        console.log(`   👤 Personalized: ${hasPersonalization}`);
        console.log(`   📊 Depth-aware: ${hasDepthMention}`);
        
      } catch (error) {
        console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
      
      console.log('');
    });
  }

  /**
   * Run all tests
   */
  static runAllTests(): void {
    console.log('🧪 RUNNING COMPREHENSIVE PROMPT BUILDER TESTS 🧪\n');
    console.log('═'.repeat(80));
    
    try {
      this.testUniversalThemeExtraction();
      this.testJungianVoice();
      this.testResponseParsing();
      this.testPromptOptimization();
      
      console.log('\n✅ ALL TESTS COMPLETED');
      console.log('═'.repeat(80));
      
    } catch (error) {
      console.error('\n❌ TEST SUITE FAILED:', error);
    }
  }

  /**
   * Quick test with a single dream
   */
  static quickTest(dreamText: string): void {
    console.log('\n🚀 QUICK DREAM ANALYSIS TEST\n');
    console.log(`Dream: "${dreamText}"\n`);
    
    try {
      const elements = PromptBuilderService.extractUniversalElements(dreamText);
      
      console.log('📊 Results:');
      console.log(`   Emotional tone: ${elements.emotionalTone}`);
      console.log(`   Dream type: ${elements.dreamType}`);
      console.log(`   Key symbols: ${elements.keySymbols.join(', ')}`);
      console.log(`   Themes found: ${elements.detectedThemes.length}`);
      
      if (elements.detectedThemes.length > 0) {
        console.log('\n🎯 Top themes:');
        elements.detectedThemes.slice(0, 3).forEach(theme => {
          console.log(`   • ${theme.theme.name} (${Math.round(theme.relevance * 100)}%)`);
        });
      }
      
    } catch (error) {
      console.error('❌ Error:', error);
    }
  }
} 