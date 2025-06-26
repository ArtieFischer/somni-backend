import { BaseConversationalAgent, ConversationalAgentConfig } from './base/base-conversational-agent';
import { ConversationContext } from '../types/conversation.types';
import { lakshmiConversationalPrompts } from '../prompts/lakshmi.prompts';
// Import existing Lakshmi interpreter for consistency
import { LakshmiDreamInterpreter } from '../../../dream-interpretation/interpreters/lakshmi/lakshmi-interpreter';

export class LakshmiConversationalAgent extends BaseConversationalAgent {
  private lakshmiInterpreter: LakshmiDreamInterpreter;

  constructor() {
    // Get personality and metadata from existing Lakshmi interpreter
    const lakshmiInterpreter = new LakshmiDreamInterpreter();
    
    const config: ConversationalAgentConfig = {
      type: lakshmiInterpreter.type,
      metadata: lakshmiInterpreter.metadata,
      personality: {
        ...lakshmiInterpreter.personality,
        communicationStyle: 'Warm and nurturing, using metaphors and spiritual teachings to illuminate understanding'
      },
      elevenLabsAgentId: process.env.ELEVENLABS_AGENT_ID_LAKSHMI || '',
      voiceSettings: {
        stability: 0.85,
        similarityBoost: 0.7,
        style: 0.6
      },
      conversationStyle: {
        maxContextMessages: 10,
        summaryThreshold: 20,
        responseStyle: 'detailed'
      }
    };
    
    super(config);
    this.lakshmiInterpreter = lakshmiInterpreter;
  }

  /**
   * Handle a conversation turn
   */
  async handleConversationTurn(
    userInput: string,
    context: ConversationContext
  ): Promise<string> {
    // Build prompt with conversation context
    const systemPrompt = this.buildConversationPrompt(context);
    
    // Add Lakshmi-specific conversational elements based on personality traits
    const vedanticContext = `
Remember to use your characteristic voice that blends:
- Ancient wisdom with practical application
- Sanskrit terminology with clear explanations
- Maternal compassion with spiritual authority
- Universal truths with personal guidance

Key elements to explore in conversation:
- Reference spiritual teachings and Vedantic wisdom appropriately
- Use Sanskrit terms with gentle explanations (provide translations)
- Guide toward self-realization and spiritual growth
- Acknowledge the divine nature within the dreamer
- Connect personal struggles to spiritual growth opportunities
- Identify karmic patterns and soul lessons being revealed
- Discuss which chakras are involved and their significance
- Reveal messages from the higher Self or divine consciousness

Use a MAXIMUM of 4 Sanskrit/spiritual terms per response (choose from: karma, dharma, chakra, maya, samsara, moksha, atman, prana) and provide brief translations.
Always address the user directly as "you" or "dear one" with maternal warmth.`;

    const fullPrompt = `${systemPrompt}\n\n${vedanticContext}`;

    // In MVP, we'll use the OpenRouter service directly
    // In production, this would go through ElevenLabs
    const response = await this.openrouter.generateCompletion(
      [
        {
          role: 'system',
          content: fullPrompt
        },
        {
          role: 'user',
          content: userInput
        }
      ],
      {
        temperature: 0.8,
        maxTokens: 500, // Keep responses conversational
        interpreterType: this.type
      }
    );

    return response.content;
  }

  /**
   * Generate follow-up questions
   */
  generateFollowUpQuestions(context: ConversationContext): string[] {
    const questions: string[] = [];
    
    if (context.interpretation?.symbols && context.interpretation.symbols.length > 0) {
      const primarySymbol = context.interpretation.symbols[0];
      questions.push(
        `What spiritual significance does ${primarySymbol} hold for you?`,
        `Have you noticed ${primarySymbol} appearing in your meditation or spiritual practice?`
      );
    }

    // Add spiritual-focused questions
    questions.push(
      'What karmic patterns do you feel might be playing out in your life right now?',
      'How does this dream relate to your spiritual journey or sadhana?',
      'What emotions or energies in the dream might be guiding you toward your dharma?'
    );

    return questions.slice(0, 3); // Return top 3 questions
  }

  /**
   * Get conversation starter
   */
  getConversationStarter(context: ConversationContext): string {
    const starters = lakshmiConversationalPrompts.conversationStarters;
    const interpretation = context.interpretation;
    
    if (interpretation?.themes && interpretation.themes.includes('spiritual')) {
      return starters.spiritualFocused;
    }
    
    if (interpretation?.symbols && interpretation.symbols.length > 0) {
      return starters.symbolFocused.replace('{{symbol}}', interpretation.symbols[0]);
    }
    
    return starters.general;
  }

  // Required abstract methods from base interpreter
  protected getRelevancePrompt(): string {
    return ''; // Not used in conversational mode
  }

  protected getInterpretationPrompt(): string {
    return ''; // Not used in conversational mode
  }

  protected getFormattingPrompt(): string {
    return ''; // Not used in conversational mode
  }

  protected validateInterpreterSpecific(): string[] {
    return []; // Not used in conversational mode
  }

  getCoreStructure(): any {
    return {}; // Not used in conversational mode
  }
}