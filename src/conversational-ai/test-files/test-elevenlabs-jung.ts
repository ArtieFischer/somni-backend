import dotenv from 'dotenv';
import { conversationService } from '../services/conversation.service';
import { JungConversationalAgent } from '../agents/jung-conversational.agent';
import { logger } from '../../utils/logger';

dotenv.config();

/**
 * Test ElevenLabs Jung agent with dynamic variables
 */
async function testElevenLabsJungIntegration() {
  try {
    logger.info('=== Testing ElevenLabs Jung Integration ===');
    
    // Test configuration
    const TEST_USER_ID = '564e51c6-6e2b-41f1-a970-b68ad9e9e56d'; // Replace with actual test user
    const TEST_DREAM_ID = 'f51f4f18-45c2-452d-a6a0-2a6018cf78a5'; // Replace with actual test dream
    
    // 1. Create a test conversation
    logger.info('Creating test conversation...');
    const conversation = await conversationService.createConversation({
      userId: TEST_USER_ID,
      dreamId: TEST_DREAM_ID,
      interpreterId: 'jung'
    });
    logger.info('Conversation created:', conversation.id);
    
    // 2. Get user profile
    logger.info('Fetching user profile...');
    const userProfile = await conversationService.getUserProfile(TEST_USER_ID);
    logger.info('User profile:', {
      username: userProfile?.username,
      birthDate: userProfile?.birth_date,
      locale: userProfile?.locale
    });
    
    // 3. Get conversation context
    logger.info('Fetching conversation context...');
    const context = await conversationService.getConversationContext(conversation.id);
    logger.info('Context summary:', {
      hasInterpretation: !!context.interpretation,
      symbolCount: context.interpretation?.symbols?.length || 0,
      themeCount: context.interpretation?.themes?.length || 0,
      emotionalTone: context.interpretation?.emotionalTone,
      messageCount: context.previousMessages?.length || 0
    });
    
    // 4. Initialize Jung agent
    logger.info('Initializing Jung agent...');
    const jungAgent = new JungConversationalAgent();
    
    // 5. Build dynamic variables
    logger.info('Building dynamic variables...');
    const dynamicVariables = await jungAgent.buildDynamicVariables(context, userProfile);
    logger.info('Dynamic variables:', dynamicVariables);
    
    // 6. Test ElevenLabs connection
    logger.info('Testing ElevenLabs connection...');
    try {
      const elevenLabsService = await jungAgent.initializeConversation(
        conversation.id,
        context,
        userProfile
      );
      
      logger.info('ElevenLabs connection successful!');
      
      // Listen for events
      elevenLabsService.on('conversation_initiated', (data) => {
        logger.info('Conversation initiated:', data);
      });
      
      elevenLabsService.on('transcription', (data) => {
        logger.info('Transcription:', data);
      });
      
      elevenLabsService.on('agent_response', (data) => {
        logger.info('Agent response:', data);
      });
      
      elevenLabsService.on('error', (error) => {
        logger.error('ElevenLabs error:', error);
      });
      
      // Wait a bit for initialization
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Clean up
      await elevenLabsService.disconnect();
      
    } catch (error) {
      logger.error('ElevenLabs connection failed:', error);
    }
    
    // 7. End conversation
    logger.info('Ending conversation...');
    await conversationService.endConversation(conversation.id);
    
    logger.info('=== Test Complete ===');
    
  } catch (error) {
    logger.error('Test failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run test
testElevenLabsJungIntegration();