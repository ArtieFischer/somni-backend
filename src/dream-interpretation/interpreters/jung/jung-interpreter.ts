/**
 * Jung Dream Interpreter Implementation
 */

import { BaseDreamInterpreter } from '../base/base-interpreter';
import { InterpreterConfig } from '../base/interpreter-interface';
import { InterpretationCore, DreamInterpretation } from '../../types/extended';
import { JungianCore } from '../../types';
import { jungPrompts } from './jung-prompts';

export class JungDreamInterpreter extends BaseDreamInterpreter {
  constructor(config?: Partial<InterpreterConfig>) {
    super({
      type: 'jung',
      metadata: {
        name: 'Carl Jung',
        description: 'Analytical psychology approach focusing on archetypes, the collective unconscious, and individuation',
        strengths: ['Shadow work', 'Archetypal analysis', 'Individuation guidance'],
        approach: 'Explores the compensatory nature of dreams and their role in psychological balance'
      },
      personality: {
        name: 'Carl Jung',
        description: 'the renowned Swiss psychiatrist and psychoanalyst who founded analytical psychology',
        voiceSignature: `Your voice carries the weight of decades spent exploring the depths of the human psyche. 
You speak with the authority of one who has mapped the collective unconscious, yet maintain a sense of wonder 
at its mysteries. Your interpretations weave together personal and universal symbols, always pointing toward 
the path of individuation. You are both scientist and mystic, grounding spiritual insights in psychological 
understanding.`,
        traits: ['analytical', 'wise', 'scholarly', 'integrative'],
        languagePatterns: [
          'references to archetypal patterns',
          'connecting personal to collective themes',
          'emphasis on compensation and balance',
          'integration of opposites'
        ]
      },
      ...config
    });
  }
  
  protected getRelevancePrompt(): string {
    return jungPrompts.relevanceAssessment;
  }
  
  protected getInterpretationPrompt(): string {
    return jungPrompts.fullInterpretation;
  }
  
  protected getFormattingPrompt(): string {
    return jungPrompts.jsonFormatting;
  }
  
  protected validateInterpreterSpecific(interpretation: DreamInterpretation): string[] {
    const errors: string[] = [];
    const core = interpretation.interpretationCore as JungianCore;
    
    if (!core || core.type !== 'jungian') {
      errors.push('Missing or invalid Jungian core');
      return errors;
    }
    
    // Validate Jungian-specific fields
    if (!core.archetypalDynamics) {
      errors.push('Missing archetypal dynamics');
    } else {
      if (!core.archetypalDynamics.primaryArchetype) {
        errors.push('Missing primary archetype');
      }
      if (!core.archetypalDynamics.shadowElements) {
        errors.push('Missing shadow elements');
      }
      if (!core.archetypalDynamics.compensatoryFunction) {
        errors.push('Missing compensatory function');
      }
    }
    
    if (!core.individuationInsights) {
      errors.push('Missing individuation insights');
    } else {
      if (!core.individuationInsights.currentStage) {
        errors.push('Missing current individuation stage');
      }
      if (!core.individuationInsights.developmentalTask) {
        errors.push('Missing developmental task');
      }
      if (!core.individuationInsights.integrationOpportunity) {
        errors.push('Missing integration opportunity');
      }
    }
    
    if (!core.complexesIdentified || core.complexesIdentified.length === 0) {
      errors.push('No complexes identified');
    }
    
    return errors;
  }
  
  getCoreStructure(): InterpretationCore {
    return {
      type: 'jungian',
      primaryInsight: '',
      keyPattern: '',
      personalGuidance: '',
      archetypalDynamics: {
        primaryArchetype: '',
        shadowElements: '',
        animaAnimus: '',
        selfArchetype: '',
        compensatoryFunction: ''
      },
      individuationInsights: {
        currentStage: '',
        developmentalTask: '',
        integrationOpportunity: ''
      },
      complexesIdentified: [],
      collectiveThemes: []
    } as JungianCore;
  }
  
  /**
   * Jung-specific method overrides for enhanced functionality
   */
  protected extractInterpretationData(interpretation: string): ReturnType<typeof super.extractInterpretationData> {
    const baseResult = super.extractInterpretationData(interpretation);
    
    // Look for Jung-specific symbols
    const jungianSymbols = [
      'shadow', 'anima', 'animus', 'self', 'persona', 'ego',
      'archetype', 'mandala', 'wise old man', 'great mother',
      'hero', 'trickster', 'child'
    ];
    
    const foundSymbols = jungianSymbols.filter(symbol => 
      interpretation.toLowerCase().includes(symbol)
    );
    
    // Combine with base symbols, removing duplicates
    const allSymbols = [...new Set([...baseResult.symbolsIdentified, ...foundSymbols])];
    
    // Extract Jungian insights
    const insightPatterns = [
      /individuation (?:process|journey) (.+?)[.!?]/gi,
      /compensatory function (.+?)[.!?]/gi,
      /collective unconscious (.+?)[.!?]/gi
    ];
    
    const jungianInsights: string[] = [];
    for (const pattern of insightPatterns) {
      const matches = interpretation.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          jungianInsights.push(match[0]);
        }
      }
    }
    
    return {
      ...baseResult,
      symbolsIdentified: allSymbols.slice(0, 10),
      keyInsights: [...baseResult.keyInsights, ...jungianInsights].slice(0, 5)
    };
  }
}