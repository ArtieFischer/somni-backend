import { BaseDreamInterpreter } from '../../../dream-interpretation/interpreters/base/base-interpreter';
import { InterpreterConfig } from '../../../dream-interpretation/interpreters/base/interpreter-interface';
import { ConversationContext, ConversationMessage } from '../../types/conversation.types';
import { ElevenLabsService } from '../../services/elevenlabs.service';
import { logger } from '../../../utils/logger';
import { supabaseService } from '../../../services/supabase';

export interface ConversationalAgentConfig extends InterpreterConfig {
  elevenLabsAgentId: string;
  voiceSettings?: {
    stability?: number;
    similarityBoost?: number;
    style?: number;
  };
  conversationStyle: {
    maxContextMessages: number;
    summaryThreshold: number;
    responseStyle: 'detailed' | 'concise' | 'adaptive';
  };
}

export abstract class BaseConversationalAgent extends BaseDreamInterpreter {
  protected elevenLabsAgentId: string;
  protected voiceSettings: any;
  protected conversationStyle: any;
  protected elevenLabsService: ElevenLabsService | null = null;

  constructor(config: ConversationalAgentConfig) {
    super(config);
    this.elevenLabsAgentId = config.elevenLabsAgentId;
    this.voiceSettings = config.voiceSettings;
    this.conversationStyle = config.conversationStyle;
  }

  /**
   * Initialize ElevenLabs connection for conversation
   */
  async initializeConversation(conversationId: string, context?: ConversationContext, userProfile?: any): Promise<ElevenLabsService> {
    try {
      const apiKey = process.env.ELEVENLABS_API_KEY || '';
      
      logger.info('Initializing ElevenLabs conversation:', {
        conversationId,
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey.length,
        agentId: this.elevenLabsAgentId,
        hasAgentId: !!this.elevenLabsAgentId
      });
      
      if (!apiKey) {
        throw new Error('ELEVENLABS_API_KEY environment variable is not set');
      }
      
      if (!this.elevenLabsAgentId) {
        throw new Error('ElevenLabs agent ID is not configured');
      }
      
      this.elevenLabsService = new ElevenLabsService({
        apiKey,
        agentId: this.elevenLabsAgentId,
        voiceSettings: this.voiceSettings
      });

      // Build dynamic variables before connecting
      const dynamicVariables = context ? await this.buildDynamicVariables(context, userProfile) : undefined;
      
      // Connect with dynamic variables
      await this.elevenLabsService.connect(conversationId, dynamicVariables);
      
      if (dynamicVariables) {
        logger.info(`Initialized ElevenLabs conversation with variables:`, {
          conversationId,
          agentId: this.elevenLabsAgentId,
          dynamicVariables
        });
      }
      
      // Note: The agent should automatically send its first message
      // based on the configuration in the ElevenLabs dashboard
      
      return this.elevenLabsService;
    } catch (error) {
      logger.error('Failed to initialize conversation:', error);
      throw error;
    }
  }

  /**
   * Build ElevenLabs conversation configuration
   */
  protected buildConversationConfig(context: ConversationContext): any {
    const systemPrompt = this.buildConversationPrompt(context);
    const firstMessage = this.getConversationStarter(context);
    
    return {
      agent: {
        prompt: {
          prompt: systemPrompt
        },
        first_message: firstMessage,
        language: 'en'
      },
      tts: {
        voice_id: this.voiceSettings?.voiceId || this.elevenLabsAgentId
      },
      custom_llm_extra_body: {
        temperature: 0.8,
        max_tokens: 500
      }
    };
  }

  /**
   * Build conversation prompt with dream interpretation context
   */
  buildConversationPrompt(context: ConversationContext): string {
    const basePrompt = this.getConversationSystemPrompt();
    
    // Add dream context
    const dreamContext = `
Dream Content: ${context.dreamContent}

Interpretation Summary:
${context.interpretation?.quickTake || 'No interpretation available'}

Key Symbols: ${context.interpretation?.symbols?.join(', ') || 'None identified'}

Relevant Knowledge:
${context.relevantKnowledge.map(k => `- ${k.content} (${k.source})`).join('\n')}
`;

    // Add conversation history if available
    const historyContext = context.previousMessages ? 
      this.formatConversationHistory(context.previousMessages) : '';

    return `${basePrompt}\n\n${dreamContext}\n\n${historyContext}`;
  }

  /**
   * Build dynamic variables for ElevenLabs conversation
   */
  async buildDynamicVariables(context: ConversationContext, userProfile?: any): Promise<Record<string, any>> {
    const interpretation = context.interpretation;
    
    // Calculate age from birth_date if available
    let age = null;
    if (userProfile?.birth_date) {
      const birthDate = new Date(userProfile.birth_date);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
    }

    // Extract emotional tone data from interpretation
    let emotionalTonePrimary = 'neutral';
    let emotionalToneIntensity = 0.5;
    
    if (interpretation?.emotionalTone) {
      // emotionalTone might be a string or an object
      if (typeof interpretation.emotionalTone === 'string') {
        emotionalTonePrimary = interpretation.emotionalTone;
      } else if (typeof interpretation.emotionalTone === 'object' && interpretation.emotionalTone !== null) {
        const toneObj = interpretation.emotionalTone as any;
        if (toneObj.primary) {
          emotionalTonePrimary = toneObj.primary;
          emotionalToneIntensity = toneObj.intensity || 0.5;
        }
      }
    }
    
    // Also check in full_response for more detailed emotional analysis
    if (interpretation?.fullResponse) {
      const fullResponse = typeof interpretation.fullResponse === 'string' 
        ? JSON.parse(interpretation.fullResponse)
        : interpretation.fullResponse;
        
      if (fullResponse?.stageMetadata?.emotionalAnalysis) {
        const emotionalAnalysis = fullResponse.stageMetadata.emotionalAnalysis;
        emotionalTonePrimary = emotionalAnalysis.primaryTone || emotionalTonePrimary;
        emotionalToneIntensity = emotionalAnalysis.intensity || emotionalToneIntensity;
      }
    }

    // Extract recurring themes from interpretation
    const recurringThemes = interpretation?.themes || [];

    // Get dream metadata (mood, clarity)
    const dreamMetadata = await this.getDreamMetadata(context);
    
    // Format previous messages for the prompt
    const previousMessagesFormatted = context.previousMessages ? 
      this.formatConversationHistory(context.previousMessages.slice(-20)) : '';

    return {
      // User Context
      user_name: userProfile?.username || userProfile?.handle || 'Dreamer',
      age: age || 'unknown',
      
      // Dream Content
      dreamContent: context.dreamContent,
      dream_topic: dreamMetadata?.title || this.extractDreamTopic(context.dreamContent) || 'Dream Experience',
      dreamSymbols: Array.isArray(interpretation?.symbols) ? interpretation.symbols.join(', ') : '',
      clarity: dreamMetadata?.clarity || 75, // Default to 75% if not available
      mood: dreamMetadata?.mood || 3, // Default to neutral mood
      
      // Emotional Analysis
      emotionalToneprimary: emotionalTonePrimary,
      emotionalToneintensity: emotionalToneIntensity,
      recurringThemes: recurringThemes.join(', ') || 'none',
      
      // Interpretation Data
      quickTake: interpretation?.quickTake || '',
      interpretationSummary: interpretation?.interpretationSummary || interpretation?.interpretation || '',
      
      // Conversation Context
      previousMessages: previousMessagesFormatted.trim() || 'No previous messages',
      max_turn_length: 150, // Configurable per agent
      
      // Indicate if this is a resumed conversation
      is_resumed_conversation: context.previousMessages && context.previousMessages.length > 0 ? 'true' : 'false',
      conversation_message_count: context.previousMessages?.length || 0
    };
  }

  /**
   * Get dream metadata from dreams table
   */
  protected async getDreamMetadata(context: ConversationContext): Promise<{ clarity: number; mood: number; title: string } | null> {
    try {
      if (!context.interpretation?.dreamId) {
        return { clarity: 75, mood: 3, title: '' }; // Defaults
      }

      const { data, error } = await supabaseService.getServiceClient()
        .from('dreams')
        .select('mood, clarity, title, transcription_metadata')
        .eq('id', context.interpretation.dreamId)
        .single();

      if (error || !data) {
        logger.warn('Could not fetch dream metadata:', error);
        return { clarity: 75, mood: 3, title: '' };
      }

      return {
        clarity: data.clarity || 75,
        mood: data.mood || 3,
        title: data.title || ''
      };
    } catch (error) {
      logger.error('Error fetching dream metadata:', error);
      return { clarity: 75, mood: 3, title: '' };
    }
  }

  /**
   * Truncate text to a maximum length
   */
  protected truncateText(text: string, maxLength: number): string {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Extract a topic from dream content if no title is provided
   */
  protected extractDreamTopic(dreamContent: string): string {
    if (!dreamContent || dreamContent.length < 10) {
      return 'Dream Experience';
    }
    
    // Take the first 50 characters or first sentence
    const firstSentence = dreamContent.match(/^[^.!?]+[.!?]?/);
    if (firstSentence) {
      const topic = firstSentence[0].substring(0, 50).trim();
      return topic.endsWith('.') || topic.endsWith('!') || topic.endsWith('?') 
        ? topic.slice(0, -1) 
        : topic;
    }
    
    // Fallback to first 50 characters
    return dreamContent.substring(0, 50).trim() + '...';
  }

  /**
   * Format conversation history for context
   */
  protected formatConversationHistory(messages: ConversationMessage[]): string {
    // Take only recent messages based on configuration
    const recentMessages = messages.slice(-this.conversationStyle.maxContextMessages);
    
    return `Previous Conversation:
${recentMessages.map(m => `${m.role === 'user' ? 'User' : this.personality.name}: ${m.content}`).join('\n')}`;
  }

  /**
   * Get conversation-specific system prompt
   */
  protected getConversationSystemPrompt(): string {
    return `You are ${this.personality.name}, ${this.personality.description}. 
${this.personality.voiceSignature}

You are now in a live conversation with someone who has shared their dream with you. You have already provided an interpretation, and now you're engaging in a deeper dialogue to help them explore the meaning and significance of their dream.

Your conversational style should be:
- ${this.personality.communicationStyle}
- Maintain your unique perspective and expertise
- Be responsive to the person's emotional state
- Ask thoughtful questions to deepen understanding
- Reference specific elements from their dream and your interpretation
- Keep responses conversational and natural for voice interaction

Important: This is a voice conversation, so keep your responses suitable for spoken dialogue. Avoid overly long monologues and encourage interactive discussion.`;
  }

  /**
   * Handle conversation turn - to be implemented by specific agents
   */
  abstract handleConversationTurn(
    userInput: string,
    context: ConversationContext
  ): Promise<string>;

  /**
   * Generate follow-up questions based on interpretation
   */
  abstract generateFollowUpQuestions(context: ConversationContext): string[];

  /**
   * Get conversation starter for this interpreter
   */
  abstract getConversationStarter(context: ConversationContext): string;

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.elevenLabsService) {
      await this.elevenLabsService.disconnect();
      this.elevenLabsService = null;
    }
  }
}