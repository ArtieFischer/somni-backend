/**
 * Dream Interpretation API Controller
 * Handles HTTP requests for dream interpretation
 */

import { Request, Response } from 'express';
import { modularThreeStageInterpreter } from '../services/modular-three-stage-interpreter';
import { interpreterRegistry } from '../interpreters/registry';
import { logger } from '../../utils/logger';
import { InterpreterType } from '../types';
import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';

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

interface InterpretByIdRequest {
  dreamId: string;
  userId: string;
  interpreterType: InterpreterType;
  options?: {
    saveToDatabase?: boolean;
    includeDebugInfo?: boolean;
  };
}

export class DreamInterpretationController {
  private supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

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
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
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
        error: error instanceof Error ? error.message : 'Unknown error'
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
        
        // Default fallback for unknown interpreter types
        return {
          id: type as string,
          name: metadata?.metadata?.name || 'Unknown',
          fullName: metadata?.personality?.name || 'Unknown Interpreter',
          description: metadata?.metadata?.description || 'No description available',
          approach: metadata?.metadata?.approach || 'unknown',
          available: false,
          features: []
        };
      }).filter(Boolean);
      
      res.status(200).json({
        success: true,
        data: {
          interpreters,
          activeCount: interpreters.filter((i: any) => i?.available).length
        }
      });
      
    } catch (error) {
      logger.error('Get interpreters error', {
        error: error instanceof Error ? error.message : 'Unknown error'
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
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to extract themes'
      });
    }
  }
  
  /**
   * POST /api/v1/dreams/interpret-by-id
   * Interpret a dream by fetching all data from database
   */
  async interpretDreamById(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.info('interpretDreamById called', { 
        body: req.body,
        headers: req.headers,
        method: req.method,
        path: req.path
      });
      
      const { dreamId, userId, interpreterType, options } = req.body as InterpretByIdRequest;
      
      // Validate request
      if (!dreamId || !userId || !interpreterType) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: dreamId, userId, interpreterType'
        });
        return;
      }
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(dreamId) || !uuidRegex.test(userId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid UUID format for dreamId or userId',
          details: {
            dreamIdValid: uuidRegex.test(dreamId),
            userIdValid: uuidRegex.test(userId)
          }
        });
        return;
      }
      
      logger.info('Dream interpretation by ID request', {
        dreamId,
        userId,
        interpreter: interpreterType,
        timestamp: new Date().toISOString()
      });
      
      // Fetch dream data
      logger.info('Fetching dream from database', { dreamId, userId });
      const { data: dream, error: dreamError } = await this.supabase
        .from('dreams')
        .select('*')
        .eq('id', dreamId)
        .eq('user_id', userId)
        .single();
        
      if (dreamError || !dream) {
        logger.error('Dream fetch failed', { 
          dreamError, 
          dreamId, 
          userId,
          dreamFound: !!dream 
        });
        res.status(404).json({
          success: false,
          error: 'Dream not found or access denied'
        });
        return;
      }
      
      logger.info('Dream fetched successfully', {
        dreamId,
        hasTranscript: !!dream.raw_transcript,
        transcriptionStatus: dream.transcription_status
      });
      
      // Check if dream has transcription
      if (!dream.raw_transcript || dream.transcription_status !== 'completed') {
        res.status(422).json({
          success: false,
          error: 'Dream transcription not available'
        });
        return;
      }
      
      // Fetch themes for this dream
      logger.info('Fetching themes for dream', { dreamId });
      const { data: dreamThemes, error: themesError } = await this.supabase
        .from('dream_themes')
        .select('theme_code, similarity')
        .eq('dream_id', dreamId)
        .order('similarity', { ascending: false });
        
      logger.info('Dream themes fetch result', {
        dreamId,
        themesFound: dreamThemes?.length || 0,
        themesError
      });
        
      // Get theme details
      let themes: any[] = [];
      if (dreamThemes && dreamThemes.length > 0) {
        const themeCodes = dreamThemes.map(dt => dt.theme_code);
        logger.info('Fetching theme details', { themeCodes });
        const { data: themeDetails } = await this.supabase
          .from('themes')
          .select('code, name')
          .in('code', themeCodes);
          
        themes = dreamThemes.map(dt => {
          const detail = themeDetails?.find(td => td.code === dt.theme_code);
          return {
            code: dt.theme_code,
            name: detail?.name || dt.theme_code,
            relevanceScore: dt.similarity
          };
        });
      }
      
      // Get user context (optional)
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('birth_date, bio')
        .eq('user_id', userId)
        .single();
        
      let userContext = {};
      if (profile) {
        const age = profile.birth_date ? 
          Math.floor((Date.now() - new Date(profile.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 
          undefined;
        userContext = {
          age,
          emotionalState: dream.mood ? `Mood level: ${dream.mood}/5` : undefined
        };
      }
      
      // Call the interpreter
      logger.info('Starting interpretation', {
        dreamId,
        interpreterType,
        themeCount: themes.length,
        transcriptLength: dream.raw_transcript?.length || 0,
        hasUserContext: !!userContext
      });
      
      const result = await modularThreeStageInterpreter.interpretDream({
        dreamId,
        userId,
        dreamTranscription: dream.raw_transcript,
        interpreterType,
        themes,
        userContext
      });
      
      logger.info('Interpretation completed', {
        dreamId,
        success: result.success,
        hasData: !!result.data,
        error: result.error,
        processingTime: result.metadata?.processingTime
      });
      
      if (result.success && result.data) {
        // Save to database if requested (default: true)
        if (options?.saveToDatabase !== false) {
          await this.saveInterpretation(result.data, dreamId, userId);
        }
        
        res.status(200).json({
          success: true,
          data: {
            interpretation: result.data,
            metadata: {
              interpreterId: interpreterType,
              processingTime: Date.now() - startTime,
              themesUsed: themes.length,
              saved: options?.saveToDatabase !== false
            }
          },
          debugInfo: options?.includeDebugInfo ? result.metadata : undefined
        });
      } else {
        res.status(422).json({
          success: false,
          error: result.error || 'Failed to generate interpretation'
        });
      }
      
    } catch (error) {
      logger.error('Dream interpretation by ID error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.message : 'Unknown error') : 
          undefined
      });
    }
  }
  
  /**
   * Save interpretation to database
   */
  private async saveInterpretation(
    interpretation: any,
    dreamId: string,
    userId: string
  ): Promise<void> {
    try {
      const interpretationData = {
        dream_id: dreamId,
        user_id: userId,
        interpreter_type: interpretation.interpreterType,
        interpretation_summary: interpretation.interpretation,
        full_response: interpretation,
        dream_topic: interpretation.dreamTopic,
        quick_take: interpretation.quickTake,
        symbols: interpretation.symbols || [],
        emotional_tone: interpretation.emotionalTone || null,
        primary_insight: interpretation.interpretationCore?.primaryInsight || 
                        interpretation.interpreterCore?.primaryInsight || null,
        key_pattern: interpretation.interpretationCore?.keyPattern || 
                     interpretation.interpreterCore?.keyPattern || null,
        knowledge_fragments_used: interpretation.generationMetadata?.knowledgeFragmentsUsed || 0,
        total_fragments_retrieved: interpretation.generationMetadata?.totalFragmentsRetrieved || 0,
        fragment_ids_used: interpretation.generationMetadata?.fragmentIdsUsed || [],
        processing_time_ms: interpretation.processingTime || null,
        model_used: interpretation.generationMetadata?.model || 'gpt-4o'
      };
      
      const { error } = await this.supabase
        .from('interpretations')
        .insert(interpretationData);
        
      if (error) {
        logger.error('Failed to save interpretation', { 
          error: error.message || error,
          code: error.code,
          details: error.details,
          hint: error.hint,
          dreamId,
          userId,
          interpretationData
        });
      } else {
        logger.info('Interpretation saved successfully', { dreamId, userId });
      }
    } catch (error) {
      logger.error('Save interpretation error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
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