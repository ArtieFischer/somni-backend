import { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { conversationService } from '../services/conversation.service';
import { logger } from '../../utils/logger';
import { 
  ConversationConfig, 
  StartConversationResponse,
  EndConversationResponse 
} from '../types/conversation.types';

export class ConversationController {
  /**
   * Start a new conversation
   * POST /api/conversations/start
   */
  async startConversation(req: Request, res: Response): Promise<void> {
    try {
      const { dreamId, interpreterId } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!dreamId || !interpreterId) {
        res.status(400).json({ error: 'Missing required fields: dreamId, interpreterId' });
        return;
      }

      // Validate interpreter
      if (!['jung', 'lakshmi'].includes(interpreterId)) {
        res.status(400).json({ error: 'Invalid interpreter. MVP supports: jung, lakshmi' });
        return;
      }

      // Create conversation
      const config: ConversationConfig = {
        dreamId,
        interpreterId,
        userId
      };

      const conversation = await conversationService.createConversation(config);

      // Generate JWT token for WebSocket auth
      const wsToken = jwt.sign(
        { 
          userId,
          conversationId: conversation.id,
          type: 'conversation'
        },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      // Build WebSocket URL
      const wsProtocol = process.env.NODE_ENV === 'production' ? 'wss' : 'ws';
      const wsHost = process.env.WS_HOST || req.get('host');
      const websocketUrl = `${wsProtocol}://${wsHost}/ws/conversation`;

      const response: StartConversationResponse = {
        conversationId: conversation.id,
        websocketUrl,
        token: wsToken
      };

      res.status(201).json(response);
    } catch (error) {
      logger.error('Failed to start conversation:', error);
      res.status(500).json({ error: 'Failed to start conversation' });
    }
  }

  /**
   * End a conversation
   * POST /api/conversations/:id/end
   */
  async endConversation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Verify conversation belongs to user
      const conversation = await conversationService.getConversation(id);
      if (!conversation) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }

      if (conversation.userId !== userId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      // End conversation
      await conversationService.endConversation(id);

      // Get stats
      const stats = await conversationService.getConversationStats(id);

      const response: EndConversationResponse = {
        success: true,
        duration: stats.duration,
        messageCount: stats.messageCount
      };

      res.json(response);
    } catch (error) {
      logger.error('Failed to end conversation:', error);
      res.status(500).json({ error: 'Failed to end conversation' });
    }
  }

  /**
   * Get conversation history
   * GET /api/conversations/:id/history
   */
  async getConversationHistory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Verify conversation belongs to user
      const conversation = await conversationService.getConversation(id);
      if (!conversation) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }

      if (conversation.userId !== userId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      // Get messages and context
      const messages = await conversationService.getConversationMessages(id);
      const context = await conversationService.getConversationContext(id);
      const stats = await conversationService.getConversationStats(id);

      res.json({
        conversation: {
          id: conversation.id,
          dreamId: conversation.dreamId,
          interpreterId: conversation.interpreterId,
          startedAt: conversation.startedAt,
          endedAt: conversation.endedAt,
          status: conversation.status
        },
        messages,
        interpretation: context.interpretation,
        duration: stats.duration
      });
    } catch (error) {
      logger.error('Failed to get conversation history:', error);
      res.status(500).json({ error: 'Failed to get conversation history' });
    }
  }

  /**
   * Get conversation context (for debugging/development)
   * GET /api/conversations/:id/context
   */
  async getConversationContext(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Verify conversation belongs to user
      const conversation = await conversationService.getConversation(id);
      if (!conversation) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }

      if (conversation.userId !== userId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const context = await conversationService.getConversationContext(id);
      res.json(context);
    } catch (error) {
      logger.error('Failed to get conversation context:', error);
      res.status(500).json({ error: 'Failed to get conversation context' });
    }
  }

  /**
   * Get user's conversations
   * GET /api/conversations
   */
  async getUserConversations(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // For MVP, using direct Supabase query
      const { data, error } = await require('../../services/supabase').supabase
        .from('conversations')
        .select(`
          *,
          dreams (
            id,
            title,
            transcription
          ),
          messages (count)
        `)
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      res.json(data);
    } catch (error) {
      logger.error('Failed to get user conversations:', error);
      res.status(500).json({ error: 'Failed to get conversations' });
    }
  }
}

// Export singleton instance
export const conversationController = new ConversationController();