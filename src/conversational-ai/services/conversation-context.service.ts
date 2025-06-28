import { supabaseService } from '../../services/supabase';
import { ConversationContext } from '../types/conversation.types';
import { DreamInterpretation } from '../../dream-interpretation/types/extended';
import { logger } from '../../utils/logger';

class ConversationContextService {
  /**
   * Build comprehensive conversation context from interpretation data
   */
  async buildConversationContext(
    dreamId: string,
    interpreterId: string,
    conversationId?: string
  ): Promise<ConversationContext> {
    try {
      // Get dream interpretation using existing structure
      const interpretation = await this.getInterpretation(dreamId, interpreterId);
      
      // Get dream content
      const dream = await this.getDream(dreamId);
      
      // Extract relevant knowledge from interpretation
      const relevantKnowledge = this.extractRelevantKnowledge(interpretation);
      
      // Get previous messages if conversation exists
      const previousMessages = conversationId 
        ? await this.getConversationMessages(conversationId)
        : [];

      return {
        interpretation: interpretation ? {
          id: interpretation.dreamId, // Use dreamId as id since DreamInterpretation doesn't have id
          dreamId: interpretation.dreamId,
          interpreterType: String(interpretation.interpreterType || interpretation.interpreterId),
          interpretation: interpretation.interpretation,
          interpretationSummary: interpretation.interpretation,
          quickTake: interpretation.quickTake,
          symbols: interpretation.symbols || [],
          themes: this.extractThemes(interpretation),
          emotions: this.extractEmotions(interpretation),
          questions: this.extractQuestions(interpretation),
          additionalInsights: this.extractAdditionalInsights(interpretation),
          interpretationCore: typeof interpretation.interpretationCore === 'object' 
            ? interpretation.interpretationCore.primaryInsight 
            : (interpretation.interpretationCore || interpretation.quickTake),
          emotionalTone: typeof interpretation.emotionalTone === 'object' && interpretation.emotionalTone !== null
            ? (interpretation.emotionalTone as any).primary || String(interpretation.emotionalTone)
            : interpretation.emotionalTone,
          fullResponse: interpretation.fullResponse
        } : undefined,
        relevantKnowledge,
        dreamContent: dream?.raw_transcript || dream?.transcription || '',
        previousMessages
      };
    } catch (error) {
      logger.error('Failed to build conversation context:', error);
      throw error;
    }
  }

  /**
   * Get interpretation using existing pattern
   */
  private async getInterpretation(
    dreamId: string, 
    interpreterId: string
  ): Promise<DreamInterpretation | null> {
    try {
      const { data, error } = await supabaseService.getClient()
        .from('interpretations')
        .select('*')
        .eq('dream_id', dreamId)
        .eq('interpreter_type', interpreterId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      // Parse the full response to get complete interpretation data
      const fullResponse = data.full_response ? JSON.parse(data.full_response) : null;

      return {
        dreamId: data.dream_id,
        interpreterId: data.interpreter_type as any,
        interpreterType: data.interpreter_type,
        interpretation: data.interpretation_summary, // Use interpretation_summary from DB
        quickTake: data.quick_take,
        dreamTopic: data.dream_topic,
        symbols: data.symbols || [],
        selfReflection: fullResponse?.selfReflection || '',
        processingTime: data.processing_time_ms || 0,
        emotionalTone: data.emotional_tone,
        practicalGuidance: fullResponse?.practicalGuidance || [],
        fullInterpretation: data.interpretation_summary,
        interpretationCore: data.primary_insight ? {
          type: data.interpreter_type as any,
          primaryInsight: data.primary_insight,
          keyPattern: data.key_pattern || '',
          personalGuidance: fullResponse?.personalGuidance || ''
        } : undefined,
        authenticityMarkers: fullResponse?.authenticityMarkers || {
          personalEngagement: 0,
          vocabularyAuthenticity: 0,
          conceptualDepth: 0,
          therapeuticValue: 0
        },
        fullResponse: fullResponse,
        stageMetadata: fullResponse?.stageMetadata,
        createdAt: new Date(data.created_at),
        userId: data.user_id
      } as DreamInterpretation;
    } catch (error) {
      logger.error('Failed to get interpretation:', error);
      return null;
    }
  }

  /**
   * Get dream content
   */
  private async getDream(dreamId: string): Promise<any> {
    try {
      const { data, error } = await supabaseService.getClient()
        .from('dreams')
        .select('*')
        .eq('id', dreamId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to get dream:', error);
      return null;
    }
  }

  /**
   * Extract relevant knowledge from interpretation
   */
  private extractRelevantKnowledge(interpretation: DreamInterpretation | null): Array<{
    content: string;
    source: string;
    relevance: number;
  }> {
    if (!interpretation?.fullResponse?.stageMetadata?.relevanceAssessment?.relevantFragments) {
      return [];
    }

    const fragments = interpretation.fullResponse.stageMetadata.relevanceAssessment.relevantFragments;
    
    return fragments.map((fragment: any) => ({
      content: fragment.content,
      source: fragment.metadata?.source || fragment.reason || 'Dream interpretation',
      relevance: fragment.relevance || 0.5
    }));
  }

  /**
   * Get conversation messages
   */
  private async getConversationMessages(conversationId: string): Promise<any[]> {
    try {
      const { data, error } = await supabaseService.getClient()
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data.map((msg: any) => ({
        id: msg.id,
        conversationId: msg.conversation_id,
        role: msg.role,
        content: msg.content,
        audioUrl: msg.audio_url,
        timestamp: new Date(msg.created_at)
      }));
    } catch (error) {
      logger.error('Failed to get conversation messages:', error);
      return [];
    }
  }

  /**
   * Extract themes from interpretation
   */
  private extractThemes(interpretation: DreamInterpretation): string[] {
    if (!interpretation.fullResponse) return [];
    
    const fullResponse = interpretation.fullResponse;
    return fullResponse?.themes || 
           fullResponse?.interpretation?.themes || 
           fullResponse?.stageMetadata?.themeIdentification?.themes ||
           [];
  }

  /**
   * Extract emotions from interpretation
   */
  private extractEmotions(interpretation: DreamInterpretation): string[] {
    const emotions: string[] = [];
    
    if (interpretation.emotionalTone) {
      if (typeof interpretation.emotionalTone === 'string') {
        emotions.push(interpretation.emotionalTone);
      } else if (interpretation.emotionalTone.primary) {
        emotions.push(interpretation.emotionalTone.primary);
      }
    }
    
    if (interpretation.fullResponse?.emotions) {
      emotions.push(...interpretation.fullResponse.emotions);
    }
    
    return [...new Set(emotions)];
  }

  /**
   * Extract questions from interpretation
   */
  private extractQuestions(interpretation: DreamInterpretation): string[] {
    if (!interpretation.fullResponse) return [];
    
    const fullResponse = interpretation.fullResponse;
    return fullResponse?.questions || 
           fullResponse?.followUpQuestions ||
           fullResponse?.guidingQuestions ||
           [];
  }

  /**
   * Extract additional insights from interpretation
   */
  private extractAdditionalInsights(interpretation: DreamInterpretation): string[] {
    const insights: string[] = [];
    
    if (interpretation.practicalGuidance) {
      insights.push(...interpretation.practicalGuidance);
    }
    
    if (interpretation.fullResponse?.additionalInsights) {
      const additionalInsights = interpretation.fullResponse.additionalInsights;
      if (Array.isArray(additionalInsights)) {
        insights.push(...additionalInsights);
      } else if (typeof additionalInsights === 'string') {
        insights.push(additionalInsights);
      }
    }
    
    return insights;
  }

  /**
   * Get themes and symbols for conversation guidance
   */
  async getInterpretationHighlights(interpretation: DreamInterpretation | null): Promise<{
    primarySymbols: string[];
    keyThemes: string[];
    emotionalTone: any;
    coreInsights: string[];
  }> {
    if (!interpretation) {
      return {
        primarySymbols: [],
        keyThemes: [],
        emotionalTone: null,
        coreInsights: []
      };
    }

    // Extract core insights from interpretation
    const coreInsights: string[] = [];
    
    // From Jungian interpretation
    if (interpretation.interpretationCore?.type === 'jungian') {
      const core = interpretation.interpretationCore as any;
      if (core.primaryInsight) coreInsights.push(core.primaryInsight);
      if (core.archetypalDynamics?.compensatoryFunction) {
        coreInsights.push(`Compensatory function: ${core.archetypalDynamics.compensatoryFunction}`);
      }
    }
    
    // From Vedantic interpretation  
    if (interpretation.interpretationCore?.type === 'vedantic') {
      const core = interpretation.interpretationCore as any;
      if (core.primaryInsight) coreInsights.push(core.primaryInsight);
      if (core.spiritualDynamics?.soulLesson) {
        coreInsights.push(`Soul lesson: ${core.spiritualDynamics.soulLesson}`);
      }
    }

    return {
      primarySymbols: interpretation.symbols?.slice(0, 3) || [],
      keyThemes: interpretation.symbols?.slice(0, 3) || [],
      emotionalTone: interpretation.emotionalTone,
      coreInsights: coreInsights.slice(0, 3)
    };
  }
}

// Export singleton instance
export const conversationContextService = new ConversationContextService();