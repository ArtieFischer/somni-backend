import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth';
import { isAuthenticatedDev } from '../middleware/auth-dev';
import { ElevenLabsSessionService } from '../services/elevenlabs-session.service';
import { conversationService } from '../conversational-ai/services/conversation.service';
import { logger } from '../utils/logger';

const router = Router();

// Use dev auth in development for testing
const authMiddleware = process.env.NODE_ENV === 'development' ? isAuthenticatedDev : isAuthenticated;
router.use(authMiddleware);

/**
 * POST /api/v1/conversations/elevenlabs/init
 * Initialize ElevenLabs conversation with session token
 */
router.post('/init', async (req, res) => {
  try {
    const { dreamId, interpreterId } = req.body;
    const userId = req.user!.id;
    
    // Input validation
    if (!dreamId || !interpreterId) {
      res.status(400).json({
        success: false,
        error: 'dreamId and interpreterId are required'
      });
      return;
    }
    
    const validInterpreters = ['jung', 'freud', 'mary', 'lakshmi'];
    if (!validInterpreters.includes(interpreterId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid interpreter type'
      });
      return;
    }
    
    // 1. Find or create conversation
    const conversation = await conversationService.findOrCreateConversation({
      userId,
      dreamId,
      interpreterId
    });
    
    // 2. Get conversation context and user profile
    const context = await conversationService.getConversationContext(conversation.id);
    const userProfile = await conversationService.getUserProfile(userId);
    
    // 3. Get agent configuration
    const agentConfig = ElevenLabsSessionService.getAgentConfig(interpreterId);
    
    // 4. Build dynamic variables for ElevenLabs
    const dynamicVariables = await ElevenLabsSessionService.buildDynamicVariables({
      context,
      userProfile,
      dreamId,
      interpreterId
    });
    
    // 5. Create secure session token
    const sessionData = await ElevenLabsSessionService.createSessionToken({
      agentId: agentConfig.agentId,
      userId,
      conversationId: conversation.id,
      expiresIn: parseInt(process.env.ELEVENLABS_SESSION_EXPIRY || '3600')
    });
    
    // 6. Store session in database
    await ElevenLabsSessionService.storeSession({
      userId,
      conversationId: conversation.id,
      agentId: agentConfig.agentId,
      sessionToken: sessionData.token,
      expiresAt: sessionData.expiresAt
    });
    
    // 7. Update conversation with ElevenLabs agent info
    await conversationService.updateConversation(conversation.id, {
      elevenlabs_agent_id: agentConfig.agentId,
      implementation_type: 'elevenlabs'
    });
    
    // 8. Generate signed URL for frontend
    const signedUrl = await ElevenLabsSessionService.generateSignedUrl({
      agentId: agentConfig.agentId,
      sessionToken: sessionData.token,
      dynamicVariables
    });
    
    logger.info('ElevenLabs conversation initialized', {
      conversationId: conversation.id,
      interpreterId,
      userId
    });
    
    res.json({
      success: true,
      data: {
        conversationId: conversation.id,
        signedUrl,
        dynamicVariables,
        isResumed: (context.previousMessages?.length || 0) > 0,
        messageCount: context.previousMessages?.length || 0
      }
    });
    
  } catch (error) {
    logger.error('Failed to initialize ElevenLabs conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize conversation'
    });
  }
});

/**
 * POST /api/v1/conversations/messages
 * Store conversation messages from frontend
 */
router.post('/messages', async (req, res) => {
  try {
    const { conversationId, role, content, timestamp, metadata } = req.body;
    const userId = req.user!.id;
    
    // Input validation
    if (!conversationId || !role || !content) {
      res.status(400).json({
        success: false,
        error: 'conversationId, role, and content are required'
      });
      return;
    }
    
    if (!['user', 'assistant'].includes(role)) {
      res.status(400).json({
        success: false,
        error: 'Invalid role. Must be user or assistant'
      });
      return;
    }
    
    // Verify user owns conversation
    const conversation = await conversationService.getConversation(conversationId);
    if (!conversation || conversation.userId !== userId) {
      res.status(403).json({ 
        success: false, 
        error: 'Unauthorized - conversation not found or access denied' 
      });
      return;
    }
    
    // Save message
    const message = await conversationService.saveMessage({
      conversationId,
      role,
      content,
      audioUrl: metadata?.audioUrl
    });
    
    logger.info('Message saved', {
      conversationId,
      messageId: message.id,
      role
    });
    
    res.json({
      success: true,
      data: { 
        messageId: message.id,
        conversationId: message.conversationId,
        timestamp: message.timestamp
      }
    });
    
  } catch (error) {
    logger.error('Failed to save message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save message'
    });
  }
});

/**
 * POST /api/v1/conversations/elevenlabs/refresh-token
 * Refresh session token for long conversations
 */
router.post('/refresh-token', async (req, res) => {
  try {
    const { conversationId } = req.body;
    const userId = req.user!.id;
    
    if (!conversationId) {
      res.status(400).json({
        success: false,
        error: 'conversationId is required'
      });
      return;
    }
    
    // Verify conversation ownership
    const conversation = await conversationService.getConversation(conversationId);
    if (!conversation || conversation.userId !== userId) {
      res.status(403).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
      return;
    }
    
    // Get existing session
    const existingSession = await ElevenLabsSessionService.getSession(conversationId);
    if (!existingSession) {
      res.status(404).json({
        success: false,
        error: 'No active session found'
      });
      return;
    }
    
    // Create new session token
    const sessionData = await ElevenLabsSessionService.createSessionToken({
      agentId: existingSession.agent_id,
      userId,
      conversationId,
      expiresIn: parseInt(process.env.ELEVENLABS_SESSION_EXPIRY || '3600')
    });
    
    // Update session in database
    await ElevenLabsSessionService.updateSession(existingSession.id, {
      sessionToken: sessionData.token,
      expiresAt: sessionData.expiresAt
    });
    
    // Generate new signed URL
    const signedUrl = await ElevenLabsSessionService.generateSignedUrl({
      agentId: existingSession.agent_id,
      sessionToken: sessionData.token
    });
    
    logger.info('Session token refreshed', {
      conversationId,
      sessionId: existingSession.id
    });
    
    res.json({
      success: true,
      data: { 
        signedUrl,
        expiresAt: sessionData.expiresAt
      }
    });
    
  } catch (error) {
    logger.error('Failed to refresh token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh token'
    });
  }
});

/**
 * GET /api/v1/conversations/elevenlabs/validate-session/:conversationId
 * Validate session token status
 */
router.get('/validate-session/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user!.id;
    
    // Verify conversation ownership
    const conversation = await conversationService.getConversation(conversationId);
    if (!conversation || conversation.userId !== userId) {
      res.status(403).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
      return;
    }
    
    // Get session
    const session = await ElevenLabsSessionService.getSession(conversationId);
    if (!session) {
      res.status(404).json({
        success: false,
        error: 'No session found'
      });
      return;
    }
    
    // Check if session is expired
    const isExpired = new Date() > new Date(session.expires_at);
    
    res.json({
      success: true,
      data: {
        sessionId: session.id,
        isValid: !isExpired,
        expiresAt: session.expires_at,
        agentId: session.agent_id
      }
    });
    
  } catch (error) {
    logger.error('Failed to validate session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate session'
    });
  }
});

export default router;