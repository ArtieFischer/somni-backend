import { logger } from '../../utils/logger';

export interface QACheck {
  name: string;
  description: string;
  check: (output: any) => boolean;
  severity: 'error' | 'warning';
}

export interface QAResult {
  passed: boolean;
  failedChecks: Array<{
    name: string;
    description: string;
    severity: 'error' | 'warning';
  }>;
  score: number;
}

/**
 * Quality Assurance module for post-generation validation
 */
export class QualityAssurance {
  /**
   * Freud-specific quality checks
   */
  static getFreudChecks(): QACheck[] {
    return [
      {
        name: 'rag_integration',
        description: 'Check if RAG passages are integrated into interpretation',
        check: (output: any) => {
          if (!output.ragContext || output.ragContext.passages.length === 0) {
            return true; // No RAG context to check
          }
          
          const interpretation = output.interpretation?.toLowerCase() || '';
          const passages = output.ragContext.passages || [];
          
          // Check if at least one passage concept is referenced
          return passages.some((p: any) => {
            const keywords = p.content.toLowerCase().split(/\s+/).filter((w: string) => w.length > 5);
            return keywords.some((keyword: string) => interpretation.includes(keyword));
          });
        },
        severity: 'warning'
      },
      {
        name: 'forbidden_phrases',
        description: 'Check for forbidden Freudian clichés',
        check: (output: any) => {
          const forbidden = [
            'oedipus complex',
            'wolf man',
            'rat man',
            'manifest vs latent content',
            'what we have here'
          ];
          
          const allText = JSON.stringify(output).toLowerCase();
          return !forbidden.some(phrase => allText.includes(phrase));
        },
        severity: 'error'
      },
      {
        name: 'voice_authenticity',
        description: 'Check for Freud\'s authoritative voice markers',
        check: (output: any) => {
          const interpretation = output.interpretation || '';
          const voiceMarkers = [
            /I (detect|observe|must|find|see)/i,
            /It is (clear|evident|apparent) that/i,
            /This (reveals|demonstrates|indicates)/i,
            /you (are|have|experience)/i
          ];
          
          return voiceMarkers.some(marker => marker.test(interpretation));
        },
        severity: 'warning'
      },
      {
        name: 'psychoanalytic_terminology',
        description: 'Check for proper psychoanalytic terminology',
        check: (output: any) => {
          const interpretation = output.interpretation || '';
          const terms = [
            'repression', 'displacement', 'condensation', 'libido',
            'cathexis', 'dream-work', 'unconscious', 'defense',
            'transference', 'id', 'ego', 'superego'
          ];
          
          // Should use at least 2 technical terms
          const usedTerms = terms.filter(term => 
            new RegExp(`\\b${term}\\b`, 'i').test(interpretation)
          );
          
          return usedTerms.length >= 2;
        },
        severity: 'warning'
      },
      {
        name: 'interpretation_length',
        description: 'Check interpretation is substantive',
        check: (output: any) => {
          const interpretation = output.interpretation || '';
          const wordCount = interpretation.split(/\s+/).length;
          return wordCount >= 100 && wordCount <= 450;
        },
        severity: 'warning'
      },
      {
        name: 'dream_work_present',
        description: 'Check if dream work section explains mechanisms',
        check: (output: any) => {
          const dreamWork = output.dreamWork || '';
          return dreamWork.length > 50 && /mechanism|process|dynamic/i.test(dreamWork);
        },
        severity: 'warning'
      },
      {
        name: 'no_generic_openings',
        description: 'Check for absence of generic template openings',
        check: (output: any) => {
          const interpretation = output.interpretation || '';
          const genericOpenings = [
            /^The mechanisms at work/i,
            /^What we have here/i,
            /^This dream reveals/i,
            /^Your dream shows/i
          ];
          
          return !genericOpenings.some(pattern => pattern.test(interpretation));
        },
        severity: 'error'
      }
    ];
  }
  
  /**
   * Run quality checks on generated output
   */
  static async runChecks(
    output: any,
    interpreterType: string,
    ragContext?: any
  ): Promise<QAResult> {
    const outputWithRag = { ...output, ragContext };
    
    let checks: QACheck[] = [];
    
    switch (interpreterType) {
      case 'freud':
        checks = this.getFreudChecks();
        break;
      // Add other interpreter checks here
      default:
        logger.warn(`No QA checks defined for interpreter: ${interpreterType}`);
        return { passed: true, failedChecks: [], score: 100 };
    }
    
    const failedChecks = checks
      .filter(check => !check.check(outputWithRag))
      .map(check => ({
        name: check.name,
        description: check.description,
        severity: check.severity
      }));
    
    const errorCount = failedChecks.filter(c => c.severity === 'error').length;
    const warningCount = failedChecks.filter(c => c.severity === 'warning').length;
    
    const score = Math.max(0, 100 - (errorCount * 20) - (warningCount * 10));
    const passed = errorCount === 0 && score >= 70;
    
    if (!passed) {
      logger.warn('QA checks failed', {
        interpreterType,
        failedChecks,
        score,
        errorCount,
        warningCount
      });
    }
    
    return {
      passed,
      failedChecks,
      score
    };
  }
  
  /**
   * Suggest improvements based on failed checks
   */
  static getSuggestions(result: QAResult): string[] {
    const suggestions: string[] = [];
    
    for (const check of result.failedChecks) {
      switch (check.name) {
        case 'rag_integration':
          suggestions.push('Integrate more concepts from the retrieved psychoanalytic passages');
          break;
        case 'forbidden_phrases':
          suggestions.push('Remove clichéd Freudian phrases and use more original formulations');
          break;
        case 'voice_authenticity':
          suggestions.push('Use more direct address ("you") and authoritative statements ("I detect")');
          break;
        case 'psychoanalytic_terminology':
          suggestions.push('Include more technical psychoanalytic terms naturally in the interpretation');
          break;
        case 'interpretation_length':
          suggestions.push('Ensure interpretation is between 100-450 words');
          break;
        case 'no_generic_openings':
          suggestions.push('Start with a unique, dream-specific opening rather than template language');
          break;
      }
    }
    
    return suggestions;
  }
}