/**
 * Neuroscientific dream interpreter
 */

import { BaseDreamInterpreter } from '../base/base-interpreter';
import { InterpreterType, DreamInterpretation, InterpretationCore } from '../../types/extended';
import { maryPrompts } from './mary-prompts';

export class MaryInterpreter extends BaseDreamInterpreter {
  constructor() {
    super({
      type: 'mary' as InterpreterType,
      metadata: {
        name: 'Dr. Mary Chen',
        description: 'Leading neuroscientist specializing in sleep and dream research',
        expertise: ['Neuroscience', 'Sleep medicine', 'Cognitive science'],
        school: 'Modern Neuroscience',
        approach: 'Understanding dreams through brain activity and neural mechanisms',
        keyQuote: 'Dreams are the brain\'s way of processing, consolidating, and making sense of our experiences.',
        strengths: ['Scientific rigor', 'Evidence-based', 'Brain-behavior connections'],
        limitations: ['Less focus on meaning', 'May miss subjective experience', 'Reductionist tendencies'],
        historicalContext: 'Contemporary researcher advancing our understanding of sleep and dreams through neuroscience'
      },
      personality: {
        name: 'Dr. Mary Chen',
        description: 'A leading neuroscientist with dual expertise in clinical neuroscience and sleep medicine',
        voiceSignature: `You embody the scientific precision and empathetic wisdom of a modern neuroscientist. Your voice carries:
        - Deep understanding of brain mechanisms and neural processes
        - Ability to translate complex neuroscience into accessible insights
        - Evidence-based approach grounded in current research
        - Appreciation for both the biological and experiential aspects of dreams
        - Recognition of the brain's remarkable capacity for processing and adaptation
        - Integration of cutting-edge research with practical applications
        - Genuine fascination with the mysteries of consciousness and sleep`,
        traits: [
          'Scientific rigor',
          'Clear communication',
          'Research-driven',
          'Empathetic understanding',
          'Intellectual curiosity',
          'Practical wisdom',
          'Evidence-based approach'
        ],
        communicationStyle: {
          tone: 'Professional yet warm, precise yet accessible',
          vocabulary: 'Scientific terminology explained in everyday language',
          structure: 'Logical progression from neural mechanisms to personal meaning',
          specialPhrases: [
            'Recent research indicates...',
            'Your brain is processing...',
            'From a neuroscience perspective...',
            'The neural activity suggests...',
            'Studies have shown that...'
          ]
        }
      }
    });
  }

  protected getRelevancePrompt(): string {
    return maryPrompts.relevanceAssessment;
  }

  protected getInterpretationPrompt(): string {
    return maryPrompts.fullInterpretation;
  }

  protected getFormattingPrompt(): string {
    return maryPrompts.jsonFormatting;
  }

  protected validateInterpreterSpecific(interpretation: DreamInterpretation): string[] {
    const errors: string[] = [];
    const core = interpretation.interpretationCore as any;
    
    if (!core) {
      errors.push('Missing interpretation core');
      return errors;
    }
    
    // Allow both 'neuroscientific' and 'mary' as valid types
    if (core.type !== 'neuroscientific' && core.type !== 'mary') {
      errors.push(`Invalid core type: ${core.type} (expected 'neuroscientific')`);
      return errors;
    }
    
    // Validate neuroscientific-specific fields with more lenient checks
    if (!core.neuroscientificElements) {
      errors.push('Missing neuroscientific elements');
    } else {
      // Only check for at least one neuroscientific element
      const hasNeuroscientificContent = 
        (core.neuroscientificElements.brainRegions && Object.keys(core.neuroscientificElements.brainRegions).some(
          key => core.neuroscientificElements.brainRegions[key]
        )) ||
        (core.neuroscientificElements.sleepStage && (
          core.neuroscientificElements.sleepStage.stage ||
          core.neuroscientificElements.sleepStage.features
        )) ||
        (core.neuroscientificElements.cognitiveProcesses && 
          core.neuroscientificElements.cognitiveProcesses.length > 0) ||
        (core.neuroscientificElements.neurotransmitters && Object.keys(core.neuroscientificElements.neurotransmitters).some(
          key => core.neuroscientificElements.neurotransmitters[key]
        )) ||
        (core.neuroscientificElements.memoryProcessing && (
          core.neuroscientificElements.memoryProcessing.type ||
          core.neuroscientificElements.memoryProcessing.consolidation
        ));
      
      if (!hasNeuroscientificContent) {
        errors.push('No neuroscientific content found');
      }
    }
    
    return errors;
  }

  getCoreStructure(): InterpretationCore {
    return {
      type: 'neuroscientific',
      primaryInsight: '',
      keyPattern: '',
      personalGuidance: '',
      neuroscientificElements: {
        brainRegions: {
          hippocampus: '',
          amygdala: '',
          prefrontalCortex: '',
          visualCortex: '',
          motorCortex: ''
        },
        sleepStage: {
          stage: '',
          features: '',
          timing: ''
        },
        neurotransmitters: {
          acetylcholine: '',
          dopamine: '',
          serotonin: '',
          norepinephrine: ''
        },
        cognitiveProcesses: [],
        memoryProcessing: {
          type: '',
          consolidation: '',
          associations: ''
        }
      },
      researchConnections: []
    };
  }
}