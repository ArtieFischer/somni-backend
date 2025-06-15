import type { InterpreterType } from '../types';
import { BasePromptBuilder, type DreamAnalysisRequest, type PromptTemplate } from './base';
import { JungianPromptBuilder } from './interpreters/jung/builder';
import { FreudianPromptBuilder } from './interpreters/freud/builder';
import { NeuroscientistPromptBuilder } from './interpreters/neuroscientist/builder';

/**
 * Factory for creating prompt builders
 * Now supports both Jung and Freud interpreters
 */
export class PromptBuilderFactory {
  static create(interpreterType: InterpreterType): BasePromptBuilder {
    switch (interpreterType) {
      case 'jung':
        return new JungianPromptBuilder();
      case 'freud':
        return new FreudianPromptBuilder();
      case 'neuroscientist':
        return new NeuroscientistPromptBuilder();
      case 'astrologist':
        throw new Error(`${interpreterType} interpreter is not yet implemented. Currently 'jung', 'freud', and 'neuroscientist' are supported.`);
      default:
        throw new Error(`Unknown interpreter type: ${interpreterType}. Currently 'jung', 'freud', and 'neuroscientist' are supported.`);
    }
  }
}

/**
 * Main prompt builder service
 */
export class PromptBuilderService {
  /**
   * Build interpretation prompt for Jung interpreter
   */
  static async buildInterpretationPrompt(request: DreamAnalysisRequest): Promise<PromptTemplate> {
    try {
      const builder = PromptBuilderFactory.create(request.interpreterType);
      return builder.buildPrompt(request);
    } catch (error) {
      throw new Error(`Failed to build prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 