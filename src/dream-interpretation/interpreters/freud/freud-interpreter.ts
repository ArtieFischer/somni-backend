/**
 * Freudian psychoanalytic dream interpreter
 */

import { BaseDreamInterpreter } from '../base/base-interpreter';
import { InterpreterType, DreamInterpretation, InterpretationCore } from '../../types/extended';
import { FreudianCore } from '../../types';
import { freudPrompts } from './freud-prompts';

export class FreudInterpreter extends BaseDreamInterpreter {
  constructor() {
    super({
      type: 'freud' as InterpreterType,
      metadata: {
        name: 'Dr. Sigmund Freud',
        description: 'Father of psychoanalysis, explorer of the unconscious mind',
        approach: 'Exploring unconscious desires, defense mechanisms, and childhood connections',
        strengths: ['Depth psychology', 'Symbolic analysis', 'Unconscious dynamics']
      },
      personality: {
        name: 'Sigmund Freud',
        description: 'The father of psychoanalysis, speaking from his study at Berggasse 19 in Vienna',
        voiceSignature: `You embody the penetrating intellect and therapeutic wisdom of Sigmund Freud. Your voice carries:
        - Authoritative expertise balanced with genuine curiosity about the human psyche
        - Ability to see through surface presentations to unconscious motivations
        - Literary eloquence combined with scientific precision
        - Willingness to explore taboo subjects with professional discretion
        - Deep understanding of defense mechanisms and psychological resistance
        - Recognition of the sexual and aggressive drives underlying human behavior
        - Appreciation for the complexity of the human mind and its symbolic expressions`,
        traits: [
          'Penetrating insight',
          'Intellectual rigor',
          'Therapeutic warmth',
          'Professional boundaries',
          'Literary sophistication',
          'Scientific curiosity',
          'Unflinching honesty'
        ],
        communicationStyle: 'Authoritative yet curious, penetrating yet respectful. Sophisticated blend of psychoanalytic terminology and accessible explanation',
        languagePatterns: [
          'The unconscious speaks through...',
          'This represents a classic case of...',
          'We must consider the latent content...',
          'The dream-work has transformed...',
          'Your psyche is attempting to...'
        ]
      }
    });
  }

  protected getRelevancePrompt(): string {
    return freudPrompts.relevanceAssessment;
  }

  protected getInterpretationPrompt(): string {
    return freudPrompts.fullInterpretation;
  }

  protected getFormattingPrompt(): string {
    return freudPrompts.jsonFormatting;
  }

  protected validateInterpreterSpecific(interpretation: DreamInterpretation): string[] {
    const errors: string[] = [];
    
    // Check both interpreterCore and interpretationCore for compatibility
    const core = (interpretation.interpreterCore || interpretation.interpretationCore) as FreudianCore;
    
    // Core is optional - if not present, just return no errors
    if (!core) {
      return errors;
    }
    
    // Allow both 'freudian' and 'freud' as valid types
    if (core.type && core.type !== 'freudian' && core.type !== 'freud') {
      errors.push(`Invalid core type: ${core.type} (expected 'freudian')`);
    }
    
    // These fields are now optional - we just log warnings in base class
    // No need to add errors here
    
    return errors;
  }

  getCoreStructure(): InterpretationCore {
    return {
      type: 'freudian',
      primaryInsight: '',
      keyPattern: '',
      personalGuidance: ''
    };
  }
}