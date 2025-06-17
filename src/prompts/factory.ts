import type { InterpreterType } from '../types';
import { BasePromptBuilder, type DreamAnalysisRequest, type PromptTemplate } from './base';
import { JungianPromptBuilder } from './interpreters/jung/builder';
import { JungianRAGPromptBuilder } from './interpreters/jung/builder-with-rag';
import { FreudianPromptBuilder } from './interpreters/freud/builder';
import { NeuroscientistPromptBuilder } from './interpreters/neuroscientist/builder';
import { features } from '../config/features';

/**
 * Factory for creating prompt builders
 * Now supports both Jung and Freud interpreters with optional RAG enhancement
 */
export class PromptBuilderFactory {
  
  static create(interpreterType: InterpreterType): BasePromptBuilder {
    switch (interpreterType) {
      case 'jung':
        // Use RAG-enhanced builder if enabled
        if (features.rag.enabled && features.rag.interpreters.jung) {
          return new JungianRAGPromptBuilder();
        }
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
  static async buildInterpretationPrompt(request: DreamAnalysisRequest): Promise<{
    prompt: PromptTemplate;
    ragContext?: any;
  }> {
    try {
      const builder = PromptBuilderFactory.create(request.interpreterType);
      
      // Check if this is a RAG-enhanced builder with async support
      if (builder instanceof JungianRAGPromptBuilder && 'buildPromptAsync' in builder) {
        const prompt = await (builder as JungianRAGPromptBuilder).buildPromptAsync(request);
        const ragContext = (builder as JungianRAGPromptBuilder).getLastRetrievedContext();
        return { prompt, ragContext };
      }
      
      // Otherwise use synchronous method
      return { prompt: builder.buildPrompt(request), ragContext: null };
    } catch (error) {
      throw new Error(`Failed to build prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 