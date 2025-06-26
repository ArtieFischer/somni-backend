/**
 * Conversation API Routes
 * HTTP endpoints for conversation management (non-WebSocket operations)
 */

import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { conversationOrchestrator } from '../dream-interpretation/services/conversation-orchestrator';
import { logger } from '../utils/logger';

const router = Router();

// Apply authentication to all routes
router.use(isAuthenticated);

// Rate limiting for conversation endpoints
const conversationRateLimit = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Allow 50 requests per 15 minutes
  message: 'Too many conversation requests. Please try again later.',
});

/**
 * GET /api/v1/conversations/active
 * Get user's active conversations
 */
router.get('/active', conversationRateLimit, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    const sessions = conversationOrchestrator.getUserSessions(userId);
    
    res.json({
      success: true,
      data: {
        sessions: sessions.map(session => ({
          id: session.id,
          conversationId: session.conversationId,
          interpreterId: session.interpreterId,
          status: session.status,
          startedAt: session.startedAt,
          dreamId: session.context.dreamId
        })),
        count: sessions.length
      }
    });
    
  } catch (error) {
    logger.error('Failed to get active conversations', {
      userId: req.user?.id,
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve active conversations'
    });
  }
});

/**
 * GET /api/v1/conversations/:conversationId
 * Get conversation details and history
 */
router.get('/:conversationId', conversationRateLimit, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    // TODO: Fetch conversation history from database
    // For now, return basic info if session is active
    const sessions = conversationOrchestrator.getUserSessions(userId);
    const session = sessions.find(s => s.conversationId === conversationId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        conversationId: session.conversationId,
        interpreterId: session.interpreterId,
        status: session.status,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        dreamId: session.context.dreamId,
        // TODO: Add conversation history
        history: []
      }
    });
    
  } catch (error) {
    logger.error('Failed to get conversation details', {
      conversationId: req.params.conversationId,
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve conversation details'
    });
  }
});

/**
 * POST /api/v1/conversations/:conversationId/end
 * End a conversation via HTTP (backup for WebSocket)
 */
router.post('/:conversationId/end', conversationRateLimit, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    // Find session by conversation ID
    const sessions = conversationOrchestrator.getUserSessions(userId);
    const session = sessions.find(s => s.conversationId === conversationId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }
    
    // End the conversation
    await conversationOrchestrator.endConversation(session.id);
    
    res.json({
      success: true,
      data: {
        conversationId,
        message: 'Conversation ended successfully'
      }
    });
    
  } catch (error) {
    logger.error('Failed to end conversation', {
      conversationId: req.params.conversationId,
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to end conversation'
    });
  }
});

/**
 * GET /api/v1/conversations/history/:dreamId
 * Get conversation history for a specific dream
 */
router.get('/history/:dreamId', conversationRateLimit, async (req, res) => {
  try {
    const { dreamId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    // TODO: Implement fetching conversation history from database
    // This would include all past conversations for this dream
    
    res.json({
      success: true,
      data: {
        dreamId,
        conversations: [],
        message: 'History endpoint not yet implemented'
      }
    });
    
  } catch (error) {
    logger.error('Failed to get conversation history', {
      dreamId: req.params.dreamId,
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve conversation history'
    });
  }
});

/**
 * GET /api/v1/conversations/stats
 * Get user's conversation statistics
 */
router.get('/stats', conversationRateLimit, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    // Get active sessions
    const activeSessions = conversationOrchestrator.getUserSessions(userId);
    
    // TODO: Get historical stats from database
    
    res.json({
      success: true,
      data: {
        activeSessions: activeSessions.length,
        totalConversations: 0, // TODO: From database
        averageDuration: 0, // TODO: Calculate from database
        favoriteInterpreter: null, // TODO: Calculate from database
        totalMessages: 0 // TODO: From database
      }
    });
    
  } catch (error) {
    logger.error('Failed to get conversation stats', {
      userId: req.user?.id,
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve conversation statistics'
    });
  }
});

export { router as conversationRouter };