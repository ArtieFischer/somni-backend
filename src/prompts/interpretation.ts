import type { JungianInsights, FreudianInsights, NeuroscientistInsights, InterpreterType, CostSummary } from '../types';
import { JungianInterpreter } from './interpreters/jung/interpreter';
import { FreudianInterpreter } from './interpreters/freud/interpreter';
import { NeuroscientistInterpreter } from './interpreters/neuroscientist/interpreter';

/**
 * Generic interpretation response parsing utilities
 * Delegates to interpreter-specific parsers for modular architecture
 */
export class InterpretationParser {
  
  /**
   * Parse AI response based on interpreter type
   * Delegates to interpreter-specific parsers
   */
  static async parseInterpretationResponse(
    aiResponse: string,
    interpreterType: InterpreterType
  ): Promise<JungianInsights | FreudianInsights | NeuroscientistInsights> {
    switch (interpreterType) {
      case 'jung':
        return JungianInterpreter.parseResponse(aiResponse);
      case 'freud':
        return FreudianInterpreter.parseResponse(aiResponse);
      case 'neuroscientist':
        return NeuroscientistInterpreter.parseResponse(aiResponse);
      default:
        throw new Error(`${interpreterType} parser not yet implemented`);
    }
  }

  /**
   * Transform cost summary from OpenRouter format to our format
   */
  static transformCostSummary(openRouterCostSummary: any): CostSummary {
    return {
      totalCost: openRouterCostSummary?.totalCost || 0,
      totalRequests: openRouterCostSummary?.totalRequests || 1,
      recentEntries: openRouterCostSummary?.recentEntries || []
    };
  }
} 