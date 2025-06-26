/**
 * Dream Interpretation API Controller
 * Handles HTTP requests for dream interpretation
 */

import { Request, Response } from 'express';
import { interpretationPipeline } from '../services/interpretation-pipeline';
import { logger } from '../../utils/logger';
import { InterpreterType } from '../types';

interface InterpretDreamRequest {
  dreamId: string;
  dreamTranscription: string;
  interpreterType: InterpreterType;
  themes?: Array<{
    code: string;
    name: string;
    relevanceScore: number;
  }>;
  userContext?: {
    age?: number;
    currentLifeSituation?: string;
    emotionalState?: string;
  };
  options?: {
    includeDebugInfo?: boolean;
  };
}

export class DreamInterpretationController {
  /**
   * POST /api/v1/dreams/interpret
   * Interpret a dream using specified interpreter
   */
  async interpretDream(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Validate request
      const validation = this.validateInterpretRequest(req.body);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: 'Invalid request',
          details: validation.errors
        });
        return;
      }
      
      const requestData: InterpretDreamRequest = req.body;
      const userId = (req as any).user?.id || 'anonymous';
      
      logger.info('Dream interpretation request received', {
        dreamId: requestData.dreamId,
        interpreter: requestData.interpreterType,
        userId
      });
      
      // Call interpretation pipeline
      const result = await interpretationPipeline.interpretDream({
        dreamId: requestData.dreamId,
        userId,
        dreamTranscription: requestData.dreamTranscription,
        interpreterType: requestData.interpreterType,
        themes: requestData.themes,
        userContext: requestData.userContext,
        options: requestData.options
      });
      
      if (result.success && result.interpretation) {
        // Success response
        res.status(200).json({
          success: true,
          data: {
            interpretation: result.interpretation,
            metadata: {
              interpreterId: requestData.interpreterType,
              processingTime: Date.now() - startTime,
              confidenceScore: result.interpretation.generationMetadata.confidenceScore
            }
          },
          debugInfo: result.debugInfo
        });
      } else {
        // Failed interpretation
        res.status(422).json({
          success: false,
          error: result.error || 'Failed to generate interpretation',
          debugInfo: result.debugInfo
        });
      }
      
    } catch (error) {
      logger.error('Dream interpretation endpoint error', {
        error: error.message,
        stack: error.stack
      });
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  /**
   * GET /api/v1/dreams/:dreamId/interpretations
   * Get all interpretations for a dream
   */
  async getDreamInterpretations(req: Request, res: Response): Promise<void> {
    try {
      const { dreamId } = req.params;
      const userId = (req as any).user?.id;
      
      // TODO: Implement fetching interpretations from database
      // This is a placeholder response
      res.status(200).json({
        success: true,
        data: {
          dreamId,
          interpretations: []
        }
      });
      
    } catch (error) {
      logger.error('Get interpretations error', {
        error: error.message
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to fetch interpretations'
      });
    }
  }
  
  /**
   * GET /api/v1/interpreters
   * Get available interpreters
   */
  async getInterpreters(req: Request, res: Response): Promise<void> {
    try {
      const interpreters = [
        {
          id: 'jung',
          name: 'Carl Jung',
          fullName: 'Dr. Carl Gustav Jung',
          description: 'Founder of analytical psychology, expert in archetypes and the collective unconscious',
          approach: 'jungian',
          available: true,
          features: [
            'Archetypal analysis',
            'Shadow work',
            'Individuation guidance',
            'Mythological connections'
          ]
        },
        {
          id: 'lakshmi',
          name: 'Lakshmi',
          fullName: 'Lakshmi Devi',
          description: 'Divine feminine wisdom keeper, spiritual guide for karmic and dharmic insights',
          approach: 'spiritual',
          available: true,
          features: [
            'Karmic patterns',
            'Spiritual evolution',
            'Chakra analysis',
            'Divine feminine wisdom'
          ]
        },
        {
          id: 'freud',
          name: 'Sigmund Freud',
          fullName: 'Dr. Sigmund Freud',
          description: 'Father of psychoanalysis, expert in unconscious desires and dream symbolism',
          approach: 'freudian',
          available: false,
          features: [
            'Unconscious desires',
            'Wish fulfillment',
            'Psychodynamic analysis',
            'Childhood connections'
          ]
        },
        {
          id: 'mary',
          name: 'Mary',
          fullName: 'Dr. Mary Neuroscientist',
          description: 'Modern neuroscience perspective on dreams and brain function',
          approach: 'cognitive',
          available: false,
          features: [
            'Brain activity patterns',
            'Memory consolidation',
            'Emotional regulation',
            'Sleep stage analysis'
          ]
        }
      ];
      
      res.status(200).json({
        success: true,
        data: {
          interpreters,
          activeCount: interpreters.filter(i => i.available).length
        }
      });
      
    } catch (error) {
      logger.error('Get interpreters error', {
        error: error.message
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to fetch interpreters'
      });
    }
  }
  
  /**
   * POST /api/v1/dreams/:dreamId/themes
   * Extract themes from a dream (if not already done)
   */
  async extractDreamThemes(req: Request, res: Response): Promise<void> {
    try {
      const { dreamId } = req.params;
      const { dreamTranscription } = req.body;
      
      if (!dreamTranscription) {
        res.status(400).json({
          success: false,
          error: 'Dream transcription is required'
        });
        return;
      }
      
      // TODO: Implement theme extraction
      // This would call the existing theme extraction service
      
      res.status(200).json({
        success: true,
        data: {
          dreamId,
          themes: [],
          message: 'Theme extraction not yet implemented'
        }
      });
      
    } catch (error) {
      logger.error('Extract themes error', {
        error: error.message
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to extract themes'
      });
    }
  }
  
  /**
   * Validate interpretation request
   */
  private validateInterpretRequest(body: any): {
    isValid: boolean;
    errors?: string[];
  } {
    const errors: string[] = [];
    
    if (!body.dreamId) {
      errors.push('dreamId is required');
    }
    
    if (!body.dreamTranscription) {
      errors.push('dreamTranscription is required');
    }
    
    if (!body.interpreterType) {
      errors.push('interpreterType is required');
    } else if (!['jung', 'lakshmi', 'freud', 'mary'].includes(body.interpreterType)) {
      errors.push('Invalid interpreterType. Must be one of: jung, lakshmi, freud, mary');
    } else if (['freud', 'mary'].includes(body.interpreterType)) {
      errors.push(`Interpreter ${body.interpreterType} is not yet available`);
    }
    
    if (body.dreamTranscription && body.dreamTranscription.length < 50) {
      errors.push('Dream transcription must be at least 50 characters');
    }
    
    if (body.dreamTranscription && body.dreamTranscription.length > 5000) {
      errors.push('Dream transcription must not exceed 5000 characters');
    }
    
    if (body.userContext) {
      if (body.userContext.age && (body.userContext.age < 13 || body.userContext.age > 120)) {
        errors.push('Invalid age. Must be between 13 and 120');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

// Export singleton instance
export const dreamInterpretationController = new DreamInterpretationController();