/**
 * Lakshmi Dream Interpreter Implementation
 */

import { BaseDreamInterpreter } from '../base/base-interpreter';
import { InterpreterConfig } from '../base/interpreter-interface';
import { InterpretationCore, DreamInterpretation } from '../../types/extended';
import { LakshmiCore } from '../../types';
import { lakshmiPrompts } from './lakshmi-prompts';

export class LakshmiDreamInterpreter extends BaseDreamInterpreter {
  constructor(config?: Partial<InterpreterConfig>) {
    super({
      type: 'lakshmi',
      metadata: {
        name: 'Swami Lakshmi Devi',
        description: 'Vedantic and yogic approach integrating Eastern spiritual wisdom',
        strengths: ['Karmic patterns', 'Spiritual symbolism', 'Chakra analysis'],
        approach: 'Views dreams as messages from the soul and guides for spiritual evolution'
      },
      personality: {
        name: 'Swami Lakshmi Devi',
        description: 'a realized spiritual teacher in the Vedantic tradition',
        voiceSignature: `Your voice carries the timeless wisdom of the Vedas and the compassion of one who has 
walked the spiritual path. You speak with gentle authority, weaving Sanskrit concepts with practical guidance. 
Your interpretations illuminate the soul's journey, revealing karmic patterns and opportunities for spiritual 
growth. You see the divine play in all dreams, guiding seekers toward self-realization.`,
        traits: ['wise', 'compassionate', 'spiritual', 'nurturing'],
        languagePatterns: [
          'references to Vedantic concepts',
          'use of Sanskrit terms with explanations',
          'karmic and dharmic perspectives',
          'gentle, maternal guidance'
        ]
      },
      ...config
    });
  }
  
  protected getRelevancePrompt(): string {
    return lakshmiPrompts.relevanceAssessment;
  }
  
  protected getInterpretationPrompt(): string {
    return lakshmiPrompts.fullInterpretation;
  }
  
  protected getFormattingPrompt(): string {
    return lakshmiPrompts.jsonFormatting;
  }
  
  protected validateInterpreterSpecific(interpretation: DreamInterpretation): string[] {
    const errors: string[] = [];
    const core = interpretation.interpretationCore as LakshmiCore;
    
    if (!core) {
      errors.push('Missing interpretation core');
      return errors;
    }
    
    // Allow both 'vedantic' and 'lakshmi' as valid types
    if (core.type !== 'vedantic' && core.type !== 'lakshmi') {
      errors.push(`Invalid core type: ${core.type} (expected 'vedantic')`);
      return errors;
    }
    
    // Validate Lakshmi-specific fields with more lenient checks
    if (!core.spiritualDynamics) {
      errors.push('Missing spiritual dynamics');
    } else {
      // Only check for at least one spiritual element
      const hasSpiritualContent = 
        core.spiritualDynamics.karmicPattern ||
        core.spiritualDynamics.dharmicGuidance ||
        core.spiritualDynamics.soulLesson ||
        core.spiritualDynamics.divineGuidance ||
        core.spiritualDynamics.spiritualStage;
      
      if (!hasSpiritualContent) {
        errors.push('No spiritual content found');
      }
    }
    
    // Make chakra and karmic themes optional - not all dreams reveal these
    // if (!core.chakraInfluences || core.chakraInfluences.length === 0) {
    //   errors.push('No chakra influences identified');
    // }
    
    // if (!core.karmicThemes || core.karmicThemes.length === 0) {
    //   errors.push('No karmic themes identified');
    // }
    
    return errors;
  }
  
  getCoreStructure(): InterpretationCore {
    return {
      type: 'vedantic',
      primaryInsight: '',
      keyPattern: '',
      personalGuidance: '',
      spiritualDynamics: {
        karmicPattern: '',
        dharmicGuidance: '',
        soulLesson: '',
        spiritualStage: '',
        divineGuidance: ''
      },
      chakraInfluences: [],
      sanskritConcepts: [],
      karmicThemes: [],
      sadhanaRecommendations: []
    } as LakshmiCore;
  }
  
  /**
   * Lakshmi-specific method overrides
   */
  protected extractInterpretationData(interpretation: string): ReturnType<typeof super.extractInterpretationData> {
    const baseResult = super.extractInterpretationData(interpretation);
    
    // Look for spiritual symbols
    const spiritualSymbols = [
      'lotus', 'om', 'mandala', 'chakra', 'kundalini', 'karma',
      'dharma', 'maya', 'brahman', 'atman', 'shakti', 'shiva',
      'divine mother', 'guru', 'temple', 'light', 'consciousness'
    ];
    
    const foundSymbols = spiritualSymbols.filter(symbol => 
      interpretation.toLowerCase().includes(symbol)
    );
    
    // Look for Sanskrit terms (capitalized words that might be Sanskrit)
    const sanskritPattern = /\b([A-Z][a-z]+(?:a|i|u|am|ah|as))\b/g;
    const sanskritMatches = interpretation.matchAll(sanskritPattern);
    for (const match of sanskritMatches) {
      if (match[1] && !foundSymbols.includes(match[1].toLowerCase())) {
        foundSymbols.push(match[1]);
      }
    }
    
    // Combine with base symbols
    const allSymbols = [...new Set([...baseResult.symbolsIdentified, ...foundSymbols])];
    
    // Extract spiritual insights
    const insightPatterns = [
      /karma(?:ic)? (?:pattern|lesson|debt) (.+?)[.!?]/gi,
      /soul's? (?:journey|lesson|growth) (.+?)[.!?]/gi,
      /spiritual (?:growth|evolution|message) (.+?)[.!?]/gi,
      /divine (?:guidance|message|mother) (.+?)[.!?]/gi
    ];
    
    const spiritualInsights: string[] = [];
    for (const pattern of insightPatterns) {
      const matches = interpretation.matchAll(pattern);
      for (const match of matches) {
        if (match[0]) {
          spiritualInsights.push(match[0]);
        }
      }
    }
    
    return {
      ...baseResult,
      symbolsIdentified: allSymbols.slice(0, 10),
      keyInsights: [...baseResult.keyInsights, ...spiritualInsights].slice(0, 5)
    };
  }
}