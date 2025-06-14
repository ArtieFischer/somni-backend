import { describe, test, expect, beforeEach } from '@jest/globals';
import { 
  PromptBuilderService, 
  PromptBuilderFactory,
  InterpretationParser,
  UNIVERSAL_THEMES,
  PromptBuilderTestUtil 
} from '../src/prompts';
import type { DreamAnalysisRequest, UniversalDreamElements } from '../src/prompts';

describe('Modular Prompt System', () => {
  
  describe('Universal Theme Extraction', () => {
    
    test('should extract themes from flying dream', () => {
      const dreamText = 'I was flying over the ocean, feeling free but also scared of falling. The water was deep blue and endless.';
      const elements = PromptBuilderService.extractUniversalElements(dreamText);
      
      expect(elements.emotionalTone).toBe('mixed');
      expect(elements.dreamType).toBe('ordinary');
      expect(elements.keySymbols).toContain('flying');
      expect(elements.keySymbols).toContain('ocean');
      expect(elements.actions).toContain('flying');
      expect(elements.setting).toContain('ocean');
      
      // Should detect flying and water themes
      const themeNames = elements.detectedThemes.map(t => t.theme.name);
      expect(themeNames).toContain('Flying');
      expect(themeNames).toContain('Water Bodies');
    });

    test('should extract themes from chase dream', () => {
      const dreamText = 'A dark figure was chasing me through the forest. I was running as fast as I could but couldn\'t escape.';
      const elements = PromptBuilderService.extractUniversalElements(dreamText);
      
      expect(elements.emotionalTone).toBe('negative');
      expect(elements.dreamType).toBe('ordinary');
      expect(elements.keySymbols).toContain('chasing');
      expect(elements.actions).toContain('running');
      expect(elements.setting).toContain('forest');
      
      const themeNames = elements.detectedThemes.map(t => t.theme.name);
      expect(themeNames).toContain('Being Chased');
      expect(themeNames).toContain('Shadow Figure');
    });

    test('should handle minimal dream content', () => {
      const dreamText = 'I walked to the store.';
      const elements = PromptBuilderService.extractUniversalElements(dreamText);
      
      expect(elements.emotionalTone).toBe('neutral');
      expect(elements.dreamType).toBe('ordinary');
      expect(elements.detectedThemes).toHaveLength(0);
      expect(elements.keySymbols).toHaveLength(0);
    });

    test('should detect nightmare characteristics', () => {
      const dreamText = 'A terrifying shadow creature was hunting me through a nightmare landscape of horror and death.';
      const elements = PromptBuilderService.extractUniversalElements(dreamText);
      
      expect(elements.emotionalTone).toBe('negative');
      expect(elements.dreamType).toBe('nightmare');
    });

    test('should identify big dreams with multiple themes', () => {
      const dreamText = `I was in a vast library that transformed into an ocean. My deceased grandmother appeared as a young woman 
        and handed me a golden key. Then I was flying above my childhood town, but it was underwater. 
        I felt both sad and liberated as I soared over the wise old man who was teaching children in the flooded streets.`;
      const elements = PromptBuilderService.extractUniversalElements(dreamText);
      
      expect(elements.detectedThemes.length).toBeGreaterThan(2);
      expect(elements.dreamType).toBe('big_dream');
      
      const themeNames = elements.detectedThemes.map(t => t.theme.name);
      expect(themeNames).toContain('Flying');
      expect(themeNames).toContain('Water Bodies');
      expect(themeNames).toContain('Wise Guide');
    });
  });

  describe('Prompt Builder Factory', () => {
    
    test('should create Jungian prompt builder', () => {
      const builder = PromptBuilderFactory.create('jung');
      expect(builder).toBeDefined();
      expect(builder.constructor.name).toBe('JungianPromptBuilder');
    });

    test('should throw error for unimplemented interpreter types', () => {
      expect(() => PromptBuilderFactory.create('freud')).toThrow('Freudian prompt builder not yet implemented');
      expect(() => PromptBuilderFactory.create('neuroscientist')).toThrow('Neuroscientist prompt builder not yet implemented');
      expect(() => PromptBuilderFactory.create('astrologist')).toThrow('Astrologist prompt builder not yet implemented');
    });
  });

  describe('Jungian Prompt Building', () => {
    
    test('should build prompt with minimal context', async () => {
      const request: DreamAnalysisRequest = {
        dreamTranscription: 'I was flying over the ocean.',
        interpreterType: 'jung',
        analysisDepth: 'initial'
      };

      const template = await PromptBuilderService.buildInterpretationPrompt(request);
      
      expect(template.systemPrompt).toContain('Carl Jung');
      expect(template.systemPrompt).toContain('genuine care');
      expect(template.analysisStructure).toContain('OPENING OBSERVATION');
      expect(template.outputFormat).toContain('JSON object');
      expect(template.variables).toBeDefined();
    });

    test('should build prompt with rich context', async () => {
      const request: DreamAnalysisRequest = {
        dreamTranscription: 'I was flying over the ocean, feeling both free and terrified.',
        interpreterType: 'jung',
        userContext: {
          age: 45,
          currentLifeSituation: 'Going through divorce and career change',
          emotionalState: 'Anxious but hopeful',
          recurringSymbols: ['water', 'flying', 'falling'],
          recentMajorEvents: ['Divorce', 'Job loss', 'Moving back to hometown']
        },
        analysisDepth: 'transformative'
      };

      const template = await PromptBuilderService.buildInterpretationPrompt(request);
      
      expect(template.systemPrompt).toContain('45');
      expect(template.systemPrompt).toContain('transformative');
      expect(template.systemPrompt).toContain('divorce');
      expect(template.systemPrompt).toContain('career change');
      expect(template.variables.age).toBe(45);
      expect(template.variables.lifePhase).toContain('midlife');
    });

    test('should personalize for different life phases', async () => {
      const youngAdultRequest: DreamAnalysisRequest = {
        dreamTranscription: 'I was lost in a maze.',
        interpreterType: 'jung',
        userContext: { age: 22 },
        analysisDepth: 'initial'
      };

      const midlifeRequest: DreamAnalysisRequest = {
        dreamTranscription: 'I was lost in a maze.',
        interpreterType: 'jung',
        userContext: { age: 45 },
        analysisDepth: 'initial'
      };

      const elderRequest: DreamAnalysisRequest = {
        dreamTranscription: 'I was lost in a maze.',
        interpreterType: 'jung',
        userContext: { age: 70 },
        analysisDepth: 'initial'
      };

      const youngTemplate = await PromptBuilderService.buildInterpretationPrompt(youngAdultRequest);
      const midlifeTemplate = await PromptBuilderService.buildInterpretationPrompt(midlifeRequest);
      const elderTemplate = await PromptBuilderService.buildInterpretationPrompt(elderRequest);

      expect(youngTemplate.systemPrompt).toContain('spring of life');
      expect(midlifeTemplate.systemPrompt).toContain('midlife');
      expect(elderTemplate.systemPrompt).toContain('evening of life');
    });
  });

  describe('Interpretation Response Parsing', () => {
    
    test('should parse well-formatted Jungian JSON response', async () => {
      const aiResponse = JSON.stringify({
        interpretation: "What strikes me immediately about your dream is the profound journey from darkness to potential illumination.",
        symbols: ["forest", "wise man", "golden key", "door", "darkness"],
        coreInsight: "Your psyche is offering you the key to unlock a new chamber of self-understanding.",
        shadowAspect: "The fear of opening the door suggests resistance to embracing new aspects of yourself.",
        guidanceForDreamer: "I encourage you to sit with this dream image and explore what doors are presenting themselves.",
        reflectiveQuestion: "What do you imagine lies beyond that locked door?"
      });

             const result = await InterpretationParser.parseInterpretationResponse(aiResponse, 'jung');
       
       expect(result.type).toBe('jungian');
       expect(result.coreMessage).toContain('psyche is offering');
       
       // Type guard for Jungian insights
       if (result.type === 'jungian') {
         expect(result.symbols).toHaveLength(5);
         expect(result.symbols[0].symbol).toBe('forest');
         expect(result.shadowAspects).toContain('The fear of opening the door');
         expect(result.reflectiveQuestions[0]).toContain('locked door');
       }
    });

    test('should parse plain text Jungian response as fallback', async () => {
      const aiResponse = `What a remarkable dream! I'm immediately drawn to the image of you wandering in that dark forest. 
        
        This wise old man who gave you a golden key represents the Self offering you something essential for your journey. 
        The fear of opening the door is completely understandable - we often hesitate at the threshold of transformation.
        
        What locked doors in your waking life might this dream be addressing?`;

             const result = await InterpretationParser.parseInterpretationResponse(aiResponse, 'jung');
       
       expect(result.type).toBe('jungian');
       expect(result.coreMessage).toContain('remarkable dream');
       
       // Type guard for Jungian insights
       if (result.type === 'jungian') {
         expect(result.phenomenologicalOpening).toContain('remarkable dream');
         expect(result.symbols.length).toBeGreaterThan(0);
         expect(result.reflectiveQuestions.length).toBeGreaterThan(0);
       }
    });

    test('should parse different interpreter types', async () => {
      const freudianResponse = "This dream reveals unconscious desires and childhood connections to authority figures.";
      const neuroscientistResponse = "This dream likely occurred during REM sleep and involves memory consolidation processes.";
      const astrologistResponse = "The cosmic energies of Mercury are influencing your dream consciousness.";

      const freudian = await InterpretationParser.parseInterpretationResponse(freudianResponse, 'freud');
      const neuroscientist = await InterpretationParser.parseInterpretationResponse(neuroscientistResponse, 'neuroscientist');
      const astrologist = await InterpretationParser.parseInterpretationResponse(astrologistResponse, 'astrologist');

      expect(freudian.type).toBe('freudian');
      expect(neuroscientist.type).toBe('neuroscientist');
      expect(astrologist.type).toBe('astrologist');
    });
  });

  describe('Cost Summary Transformation', () => {
    
    test('should transform OpenRouter cost summary to our format', () => {
      const openRouterSummary = {
        totalCost: 0.045,
        totalRequests: 3,
        recentEntries: [
          { timestamp: '2024-01-01T10:00:00Z', model: 'gpt-4', cost: 0.02, tokens: 1500 },
          { timestamp: '2024-01-01T11:00:00Z', model: 'claude-3', cost: 0.015, tokens: 1200 }
        ]
      };

      const result = InterpretationParser.transformCostSummary(openRouterSummary);
      
      expect(result.totalCost).toBe(0.045);
      expect(result.totalRequests).toBe(3);
      expect(result.recentEntries).toHaveLength(2);
    });
  });

  describe('Universal Themes Database', () => {
    
    test('should have comprehensive theme categories', () => {
      const categories = [...new Set(UNIVERSAL_THEMES.map(t => t.category))];
      
      expect(categories).toContain('character');
      expect(categories).toContain('object');
      expect(categories).toContain('setting');
      expect(categories).toContain('action');
    });

    test('should have meaningful themes with keywords', () => {
      const flyingTheme = UNIVERSAL_THEMES.find(t => t.name === 'Flying');
      const waterTheme = UNIVERSAL_THEMES.find(t => t.name === 'Water Bodies');
      
      expect(flyingTheme).toBeDefined();
      expect(flyingTheme!.keywords).toContain('flying');
      expect(flyingTheme!.commonMeanings).toContain('Freedom');
      
      expect(waterTheme).toBeDefined();
      expect(waterTheme!.keywords).toContain('ocean');
      expect(waterTheme!.commonMeanings).toContain('Unconscious mind');
    });
  });

  describe('Test Utilities Integration', () => {
    
    test('should run theme extraction test without errors', () => {
      expect(() => {
        PromptBuilderTestUtil.testUniversalThemeExtraction();
      }).not.toThrow();
    });

    test('should run Jungian voice test without errors', () => {
      expect(() => {
        PromptBuilderTestUtil.testJungianVoice();
      }).not.toThrow();
    });

    test('should run response parsing test without errors', () => {
      expect(() => {
        PromptBuilderTestUtil.testResponseParsing();
      }).not.toThrow();
    });

    test('should run quick test with sample dream', () => {
      expect(() => {
        PromptBuilderTestUtil.quickTest('I dreamed of flying over a golden city.');
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    
    test('should handle invalid interpreter type gracefully', async () => {
      await expect(
        InterpretationParser.parseInterpretationResponse('test', 'invalid' as any)
      ).rejects.toThrow('Unknown interpreter type');
    });

    test('should handle malformed JSON in AI response', async () => {
      const malformedResponse = '{ "interpretation": "test", invalid json }';
      
      const result = await InterpretationParser.parseInterpretationResponse(malformedResponse, 'jung');
      
      // Should fall back to text extraction
      expect(result.type).toBe('jungian');
      expect(result.coreMessage).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    
    test('should complete full prompt building and parsing cycle', async () => {
      const request: DreamAnalysisRequest = {
        dreamTranscription: 'I was in a dark forest and met an old wise man who gave me a golden key.',
        interpreterType: 'jung',
        userContext: {
          age: 35,
          currentLifeSituation: 'Career transition',
          emotionalState: 'Seeking guidance'
        },
        analysisDepth: 'deep'
      };

      // Step 1: Build prompt
      const template = await PromptBuilderService.buildInterpretationPrompt(request);
      expect(template.systemPrompt).toBeDefined();
      expect(template.systemPrompt).toContain('Carl Jung');
      
      // Step 2: Simulate AI response (mock what would come from the AI)
      const mockAIResponse = JSON.stringify({
        interpretation: "I'm struck by your encounter with this wise old man in the dark forest...",
        symbols: ["forest", "wise man", "golden key"],
        coreInsight: "Your psyche is offering you the key to unlock new wisdom.",
        shadowAspect: "The dark forest represents unknown aspects of yourself.",
        guidanceForDreamer: "Consider what doors this key might open in your waking life.",
        reflectiveQuestion: "What wisdom are you seeking that this figure might represent?"
      });

             // Step 3: Parse response
       const parsed = await InterpretationParser.parseInterpretationResponse(mockAIResponse, 'jung');
       
       expect(parsed.type).toBe('jungian');
       expect(parsed.coreMessage).toContain('psyche is offering');
       
       // Type guard for Jungian insights
       if (parsed.type === 'jungian') {
         expect(parsed.symbols).toHaveLength(3);
         expect(parsed.individuationGuidance).toContain('doors this key might open');
       }
    });
  });
});

describe('Performance and Reliability', () => {
  
  test('should handle large dream text efficiently', async () => {
    const largeDream = 'I was flying over the ocean. '.repeat(1000); // ~26KB text
    
    const start = Date.now();
    const elements = PromptBuilderService.extractUniversalElements(largeDream);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    expect(elements.detectedThemes.length).toBeGreaterThan(0);
  });

  test('should be consistent across multiple runs', () => {
    const dreamText = 'I was flying over the ocean, feeling free but scared of falling.';
    
    const results = Array.from({ length: 5 }, () => 
      PromptBuilderService.extractUniversalElements(dreamText)
    );
    
    // All results should be identical
    results.forEach(result => {
      expect(result.emotionalTone).toBe(results[0].emotionalTone);
      expect(result.dreamType).toBe(results[0].dreamType);
      expect(result.keySymbols).toEqual(results[0].keySymbols);
    });
  });
}); 