import type { InterpreterType } from '../types';
import { BasePromptBuilder, type DreamAnalysisRequest, type PromptTemplate, type UniversalDreamElements } from './base';
import { JungianPromptBuilder } from './interpreters/jung/builder';

/**
 * Factory for creating prompt builders based on interpreter type
 */
export class PromptBuilderFactory {
  static create(interpreterType: InterpreterType): BasePromptBuilder {
    switch (interpreterType) {
      case 'jung':
        return new JungianPromptBuilder();
      case 'freud':
        // TODO: Implement FreudianPromptBuilder
        throw new Error('Freudian prompt builder not yet implemented');
      case 'neuroscientist':
        // TODO: Implement NeuroscientistPromptBuilder
        throw new Error('Neuroscientist prompt builder not yet implemented');
      case 'astrologist':
        // TODO: Implement AstrologistPromptBuilder
        throw new Error('Astrologist prompt builder not yet implemented');
      default:
        throw new Error(`Unknown interpreter type: ${interpreterType}`);
    }
  }
}

/**
 * Main prompt builder service
 * Provides high-level interface for building interpretation prompts
 */
export class PromptBuilderService {
  /**
   * Build interpretation prompt for any interpreter type
   */
  static async buildInterpretationPrompt(request: DreamAnalysisRequest): Promise<PromptTemplate> {
    const builder = PromptBuilderFactory.create(request.interpreterType);
    return builder.buildPrompt(request);
  }

  /**
   * Extract universal elements from dream text (used for testing/debugging)
   */
  static extractUniversalElements(dreamText: string): UniversalDreamElements {
    // Create a temporary builder to access the protected method
    const tempBuilder = new (class extends BasePromptBuilder {
      protected buildInterpreterSpecificSystemPrompt(): string { return ''; }
      protected buildAnalysisStructure(): string { return ''; }
      protected buildOutputFormat(): string { return ''; }
      protected prepareTemplateVariables(): Record<string, any> { return {}; }
    })();
    
    return tempBuilder.extractUniversalElements(dreamText);
  }
} 