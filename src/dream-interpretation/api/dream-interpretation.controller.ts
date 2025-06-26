/**
 * Dream Interpretation API Controller
 * Handles HTTP requests for dream interpretation
 */

import { Request, Response } from 'express';
import { modularThreeStageInterpreter } from '../services/modular-three-stage-interpreter';
import { interpreterRegistry } from '../interpreters/registry';
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
      
      // Call modular three-stage interpreter
      const result = await modularThreeStageInterpreter.interpretDream({
        dreamId: requestData.dreamId,
        userId,
        dreamTranscription: requestData.dreamTranscription,
        interpreterType: requestData.interpreterType,
        themes: requestData.themes || [],
        userContext: requestData.userContext
      });
      
      if (result.success && result.data) {
        // Success response
        res.status(200).json({
          success: true,
          data: {
            interpretation: result.data,
            metadata: {
              interpreterId: requestData.interpreterType,
              processingTime: Date.now() - startTime,
              confidenceScore: result.data.generationMetadata?.confidenceScore || 0.9
            }
          },
          debugInfo: requestData.options?.includeDebugInfo ? result.metadata : undefined
        });
      } else {
        // Failed interpretation
        res.status(422).json({
          success: false,
          error: result.error || 'Failed to generate interpretation',
          debugInfo: requestData.options?.includeDebugInfo ? result.metadata : undefined
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
      // Get interpreters from registry and enhance with metadata
      const registeredTypes = interpreterRegistry.getTypes();
      const interpreters = registeredTypes.map(type => {
        const metadata = interpreterRegistry.getMetadata(type);
        
        if (type === 'jung') {
          return {
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
          };
        } else if (type === 'lakshmi') {
          return {
            id: 'lakshmi',
            name: 'Swami Lakshmi',
            fullName: 'Swami Lakshmi Devi',
            description: 'Vedantic spiritual teacher, guide for karmic and dharmic insights',
            approach: 'spiritual',
            available: true,
            features: [
              'Karmic patterns',
              'Spiritual evolution',
              'Chakra analysis',
              'Divine wisdom'
            ]
          };
        } else if (type === 'freud') {
          return {
            id: 'freud',
            name: 'Sigmund Freud',
            fullName: 'Dr. Sigmund Freud',
            description: 'Father of psychoanalysis, explorer of the unconscious mind',
            approach: 'psychoanalytic',
            available: true,
            features: [
              'Unconscious desires',
              'Dream-work analysis',
              'Defense mechanisms',
              'Childhood connections'
            ]
          };
        } else if (type === 'mary') {
          return {
            id: 'mary',
            name: 'Dr. Mary Chen',
            fullName: 'Dr. Mary Chen',
            description: 'Leading neuroscientist specializing in sleep and dream research',
            approach: 'neuroscientific',
            available: true,
            features: [
              'Brain activity patterns',
              'Memory consolidation',
              'Neural mechanisms',
              'Sleep stage analysis'
            ]
          };
        }
      }).filter(Boolean);
      
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