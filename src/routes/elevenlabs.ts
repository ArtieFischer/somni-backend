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
  const { dreamId, interpreterId } = req.body;
  const userId = req.user!.id;
  
  try {
    
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
    
    // 1. Find or create conversation (this keeps the same database conversation for the dream)
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
    
    // Log dynamic variables as requested
    logger.info('Dynamic variables for ElevenLabs session', {
      conversationId: conversation.id,
      dreamId,
      interpreterId,
      dynamicVariables: {
        user_name: dynamicVariables.user_name,
        max_turn_length: dynamicVariables.max_turn_length,
        dreamContent: dynamicVariables.dreamContent.substring(0, 100) + '...',
        dreamSymbols: dynamicVariables.dreamSymbols,
        age: dynamicVariables.age,
        recurringThemes: dynamicVariables.recurringThemes,
        emotionalToneprimary: dynamicVariables.emotionalToneprimary,
        emotionalToneintensity: dynamicVariables.emotionalToneintensity,
        clarity: dynamicVariables.clarity,
        mood: dynamicVariables.mood,
        quickTake: dynamicVariables.quickTake,
        interpretationSummary: dynamicVariables.interpretationSummary.substring(0, 100) + '...',
        previousMessages: dynamicVariables.previousMessages,
        dream_topic: dynamicVariables.dream_topic
      }
    });
    
    // 5. ALWAYS create a NEW session token with dynamic variables (never reuse)
    const sessionData = await ElevenLabsSessionService.createSessionToken({
      agentId: agentConfig.agentId,
      userId,
      conversationId: conversation.id,
      expiresIn: parseInt(process.env.ELEVENLABS_SESSION_EXPIRY || '3600'),
      dynamicVariables
    });
    
    // 6. Generate a NEW ElevenLabs session ID (unique for each voice session)
    const elevenLabsSessionId = `${conversation.id}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // 7. Store the NEW session in database
    await ElevenLabsSessionService.storeSession({
      userId,
      conversationId: conversation.id,
      agentId: agentConfig.agentId,
      sessionToken: sessionData.token,
      expiresAt: sessionData.expiresAt
    });
    
    // 8. Update conversation with the NEW ElevenLabs session ID
    await conversationService.updateConversation(conversation.id, {
      elevenlabs_agent_id: agentConfig.agentId,
      elevenlabs_session_id: elevenLabsSessionId,
      implementation_type: 'elevenlabs',
      last_message_at: new Date(),
      resumed_at: (context.previousMessages?.length || 0) > 0 ? new Date() : undefined
    });
    
    // 9. Generate NEW signed URL for frontend (never reuse)
    const signedUrl = await ElevenLabsSessionService.generateSignedUrl({
      agentId: agentConfig.agentId,
      sessionToken: sessionData.token,
      dynamicVariables
    });
    
    // 10. Initialize conversation with dynamic variables on ElevenLabs
    try {
      await ElevenLabsSessionService.initializeConversationWithDynamicVariables({
        agentId: agentConfig.agentId,
        dynamicVariables
      });
      logger.info('Successfully initialized NEW conversation with dynamic variables', {
        conversationId: conversation.id,
        elevenLabsSessionId,
        user_name: dynamicVariables.user_name,
        previousMessagesCount: context.previousMessages?.length || 0
      });
    } catch (error) {
      logger.warn('Failed to pre-initialize conversation, frontend will handle dynamic variables:', error);
    }
    
    logger.info('ElevenLabs conversation initialized with FRESH session', {
      conversationId: conversation.id,
      elevenLabsSessionId,
      interpreterId,
      userId,
      isNewSession: true,
      previousMessagesInConversation: context.previousMessages?.length || 0
    });
    
    // 11. Return fresh session data (never mark as resumed for ElevenLabs)
    const responseData = {
      conversationId: conversation.id,
      elevenLabsSessionId, // Always new
      signedUrl, // Always fresh
      authToken: sessionData.token, // Fresh auth token
      dynamicVariables,
      previousMessages: context.previousMessages || [], // Include for context
      isResumed: false, // ALWAYS false - no more session resumption
      messageCount: context.previousMessages?.length || 0
    };
    
    // Log the response to verify elevenLabsSessionId is included
    logger.info('Sending ElevenLabs init response', {
      conversationId: responseData.conversationId,
      elevenLabsSessionId: responseData.elevenLabsSessionId,
      hasSignedUrl: !!responseData.signedUrl,
      hasAuthToken: !!responseData.authToken,
      responseKeys: Object.keys(responseData)
    });
    
    res.json({
      success: true,
      data: responseData
    });
    
  } catch (error) {
    logger.error('Failed to initialize ElevenLabs conversation:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      dreamId,
      interpreterId,
      userId
    });
    
    // Provide more specific error messages
    let errorMessage = 'Failed to initialize conversation';
    if (error instanceof Error) {
      if (error.message.includes('Agent ID not configured')) {
        errorMessage = `Agent configuration missing for ${interpreterId}. Please check environment variables.`;
      } else if (error.message.includes('Unknown interpreter')) {
        errorMessage = 'Invalid interpreter type selected';
      } else if (error.message.includes('JWT_SECRET')) {
        errorMessage = 'Server configuration error: Missing JWT secret';
      }
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : String(error) : undefined
    });
  }
});

/**
 * POST /api/v1/conversations/messages
 * Store conversation messages from frontend
 */
router.post('/messages', async (req, res) => {
  try {
    const { conversationId, role, content, metadata } = req.body;
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
    
    // Extract elevenLabsSessionId from metadata
    const elevenLabsSessionId = metadata?.elevenLabsSessionId;
    
    // Save message with ElevenLabs metadata
    const message = await conversationService.saveMessage({
      conversationId,
      role,
      content,
      audioUrl: metadata?.audioUrl,
      elevenLabsMetadata: elevenLabsSessionId ? {
        session_id: elevenLabsSessionId,
        timestamp: metadata?.timestamp || new Date().toISOString(),
        audioUrl: metadata?.audioUrl
      } : null
    } as any);
    
    // Update conversation last_message_at
    await conversationService.updateConversation(conversationId, {
      last_message_at: new Date()
    });
    
    logger.info('Message saved', {
      conversationId,
      elevenLabsSessionId,
      messageId: message.id,
      role,
      hasMetadata: !!metadata,
      hasAudioUrl: !!metadata?.audioUrl
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