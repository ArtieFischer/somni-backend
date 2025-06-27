import { io, Socket } from 'socket.io-client';

const PORT = process.env.PORT || '3000';
const BASE_URL = `http://localhost:${PORT}`;

// Test token (replace with actual JWT token)
const TEST_TOKEN = 'your-jwt-token-here';

async function testDreamInterpretationNamespace() {
  console.log('\n🧪 Testing Dream Interpretation Namespace');
  console.log('=========================================');
  
  const dreamSocket = io(`${BASE_URL}/ws/dream`, {
    auth: { token: TEST_TOKEN },
    transports: ['websocket', 'polling']
  });

  return new Promise<void>((resolve) => {
    dreamSocket.on('connect', () => {
      console.log('✅ Connected to dream interpretation namespace');
      console.log('Socket ID:', dreamSocket.id);
      
      // Test starting a conversation
      dreamSocket.emit('startConversation', {
        dreamId: 'test-dream-123',
        interpreterId: 'jung',
        userName: 'Test User',
        initialMessage: 'I had a dream about flying'
      });
    });

    dreamSocket.on('conversationStarted', (data) => {
      console.log('✅ Conversation started:', data);
      
      // Send a test message
      dreamSocket.emit('sendMessage', {
        message: 'What does this mean?'
      });
    });

    dreamSocket.on('messageReceived', (data) => {
      console.log('✅ Message received:', data);
      
      // End conversation
      dreamSocket.emit('endConversation');
    });

    dreamSocket.on('conversationEnded', (data) => {
      console.log('✅ Conversation ended:', data);
      dreamSocket.disconnect();
      resolve();
    });

    dreamSocket.on('error', (error) => {
      console.error('❌ Dream namespace error:', error);
      dreamSocket.disconnect();
      resolve();
    });

    dreamSocket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error.message);
      resolve();
    });
  });
}

async function testConversationalAINamespace() {
  console.log('\n🧪 Testing Conversational AI Namespace');
  console.log('======================================');
  
  const conversationSocket = io(`${BASE_URL}/ws/conversation`, {
    auth: { token: TEST_TOKEN },
    query: { conversationId: 'test-conversation-456' },
    transports: ['websocket', 'polling']
  });

  return new Promise<void>((resolve) => {
    conversationSocket.on('connect', () => {
      console.log('✅ Connected to conversational AI namespace');
      console.log('Socket ID:', conversationSocket.id);
      
      // Test text input
      conversationSocket.emit('text_input', {
        text: 'Hello, can you help me understand my dreams?'
      });
    });

    conversationSocket.on('conversation_started', (data) => {
      console.log('✅ Conversation started:', data);
    });

    conversationSocket.on('text_response', (data) => {
      console.log('✅ Text response:', data);
      
      // End conversation
      conversationSocket.emit('end_conversation');
    });

    conversationSocket.on('conversation_ended', (data) => {
      console.log('✅ Conversation ended:', data);
      conversationSocket.disconnect();
      resolve();
    });

    conversationSocket.on('error', (error) => {
      console.error('❌ Conversational AI error:', error);
      conversationSocket.disconnect();
      resolve();
    });

    conversationSocket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error.message);
      resolve();
    });
  });
}

async function runTests() {
  console.log('🚀 WebSocket Namespace Tests');
  console.log('============================');
  console.log(`Server URL: ${BASE_URL}`);
  console.log('Note: Replace TEST_TOKEN with a valid JWT token\n');

  try {
    // Test dream interpretation namespace
    await testDreamInterpretationNamespace();
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test conversational AI namespace
    await testConversationalAINamespace();
    
    console.log('\n✅ All tests completed');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }

  process.exit(0);
}

// Run tests
runTests();