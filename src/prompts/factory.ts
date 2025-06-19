import type { InterpreterType } from '../types';
import { BasePromptBuilder, type DreamAnalysisRequest, type PromptTemplate } from './base';
import { JungianPromptBuilder } from './interpreters/jung/builder';
import { JungianRAGPromptBuilder } from './interpreters/jung/builder-with-rag';
import { FreudianPromptBuilder } from './interpreters/freud/builder';
import { FreudianRAGPromptBuilder } from './interpreters/freud/builder-with-rag';
import { MaryPromptBuilder } from './interpreters/mary/builder';
import { MaryRAGPromptBuilder } from './interpreters/mary/builder-with-rag';
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
        // Use RAG-enhanced builder if enabled
        if (features.rag.enabled && features.rag.interpreters.freud) {
          return new FreudianRAGPromptBuilder();
        }
        return new FreudianPromptBuilder();
      case 'mary':
        // Use RAG-enhanced builder if enabled
        if (features.rag.enabled && features.rag.interpreters.mary) {
          return new MaryRAGPromptBuilder();
        }
        return new MaryPromptBuilder();
      case 'astrologist':
        throw new Error(`${interpreterType} interpreter is not yet implemented. Currently 'jung', 'freud', and 'mary' are supported.`);
      default:
        throw new Error(`Unknown interpreter type: ${interpreterType}. Currently 'jung', 'freud', and 'mary' are supported.`);
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
      if ((builder instanceof JungianRAGPromptBuilder || builder instanceof FreudianRAGPromptBuilder || builder instanceof MaryRAGPromptBuilder) && 'buildPromptAsync' in builder) {
        const prompt = await builder.buildPromptAsync(request);
        const ragContext = builder.getLastRetrievedContext();
        return { prompt, ragContext };
      }
      
      // Otherwise use synchronous method
      return { prompt: builder.buildPrompt(request), ragContext: null };
    } catch (error) {
      throw new Error(`Failed to build prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 