import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

// Load environment variables
dotenv.config({ path: '.env.local' });

const PORT = process.env.PORT || '3000';
const API_URL = process.env.API_URL || `http://localhost:${PORT}`;
const WS_URL = process.env.WS_URL || `http://localhost:${PORT}`;

// Test credentials - replace with real ones
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'testpassword';
const TEST_DREAM_ID = 'test-dream-id'; // Replace with actual dream ID

interface TestConfig {
  token?: string;
  conversationId?: string;
  socket?: Socket;
  interpreterId: 'jung' | 'lakshmi';
}

const config: TestConfig = {
  interpreterId: 'jung' // Change to 'lakshmi' to test Lakshmi
};

// Create readline interface for interactive testing
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function getAuthToken(): Promise<string> {
  try {
    console.log('🔐 Authenticating...');
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    if (response.data.token) {
      console.log('✅ Authentication successful');
      return response.data.token;
    }
    throw new Error('No token received');
  } catch (error: any) {
    console.error('❌ Authentication failed:', error.response?.data || error.message);
    console.log('\n💡 Tip: Make sure you have a test user created with the credentials above');
    throw error;
  }
}

async function startConversation(token: string): Promise<string> {
  try {
    console.log(`\n🚀 Starting conversation with ${config.interpreterId}...`);
    const response = await axios.post(
      `${API_URL}/api/conversations/start`,
      {
        dreamId: TEST_DREAM_ID,
        interpreterId: config.interpreterId
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    if (response.data.conversationId) {
      console.log('✅ Conversation started:', response.data.conversationId);
      return response.data.conversationId;
    }
    throw new Error('No conversation ID received');
  } catch (error: any) {
    console.error('❌ Failed to start conversation:', error.response?.data || error.message);
    console.log('\n💡 Tip: Make sure you have a dream with the ID specified above');
    console.log('   You may need to create a test dream first or use an existing dream ID');
    throw error;
  }
}

function connectWebSocket(token: string, conversationId: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    console.log('\n🔌 Connecting to WebSocket...');
    
    const socket = io(WS_URL, {
      path: '/ws/conversation',
      auth: { token },
      query: { conversationId },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 3
    });

    const connectionTimeout = setTimeout(() => {
      socket.disconnect();
      reject(new Error('Connection timeout'));
    }, 10000);

    socket.on('connect', () => {
      clearTimeout(connectionTimeout);
      console.log('✅ WebSocket connected');
      console.log('   Socket ID:', socket.id);
      resolve(socket);
    });

    socket.on('connect_error', (error) => {
      clearTimeout(connectionTimeout);
      console.error('❌ Connection error:', error.message);
      reject(error);
    });

    // Set up event listeners
    socket.on('conversation_started', (data) => {
      console.log('\n🎭 Conversation Started');
      console.log('Interpreter:', data.interpreter);
      console.log('Message:', data.message);
      console.log('\n💬 You can now type messages to chat with', config.interpreterId);
      console.log('   Type "exit" to end the conversation\n');
    });

    socket.on('transcription', (event) => {
      if (event.speaker === 'agent') {
        console.log(`\n🎭 ${config.interpreterId.toUpperCase()}:`, event.text);
      } else {
        console.log(`\n👤 YOU:`, event.text);
      }
    });

    socket.on('text_response', (data) => {
      // Already handled by transcription event
    });

    socket.on('audio_response', (chunk) => {
      console.log('🔊 [Audio chunk received]');
    });

    socket.on('agent_response', (response) => {
      if (response.isTentative) {
        console.log('💭 [Thinking...]');
      }
    });

    socket.on('error', (error) => {
      console.error('❌ Error:', error);
    });

    socket.on('reconnecting', (data) => {
      console.log(`🔄 Reconnecting... (attempt ${data.attempt})`);
    });

    socket.on('reconnected', () => {
      console.log('✅ Reconnected successfully');
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected:', reason);
    });

    socket.on('conversation_ended', (data) => {
      console.log('\n👋 Conversation ended');
      process.exit(0);
    });
  });
}

async function sendMessage(socket: Socket, message: string) {
  console.log('\n📤 Sending message...');
  socket.emit('text_input', { text: message });
}

async function endConversation(socket: Socket) {
  console.log('\n🏁 Ending conversation...');
  socket.emit('end_conversation');
}

async function interactiveChat(socket: Socket) {
  console.log('\n=== Interactive Chat Mode ===\n');
  
  const askQuestion = () => {
    rl.question('You: ', async (message) => {
      if (message.toLowerCase() === 'exit') {
        await endConversation(socket);
        rl.close();
        return;
      }
      
      await sendMessage(socket, message);
      
      // Continue asking for input
      setTimeout(askQuestion, 1000);
    });
  };
  
  // Start the interaction
  askQuestion();
}

async function runTest() {
  console.log('🧪 Conversational AI WebSocket Test');
  console.log('===================================');
  console.log('Interpreter:', config.interpreterId);
  console.log('API URL:', API_URL);
  console.log('WebSocket URL:', WS_URL);
  
  try {
    // Step 1: Authenticate
    config.token = await getAuthToken();
    
    // Step 2: Start conversation
    config.conversationId = await startConversation(config.token);
    
    // Step 3: Connect WebSocket
    config.socket = await connectWebSocket(config.token, config.conversationId);
    
    // Step 4: Interactive chat
    await interactiveChat(config.socket);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down...');
  if (config.socket) {
    config.socket.disconnect();
  }
  rl.close();
  process.exit(0);
});

// Run the test
runTest().catch(console.error);

// Usage instructions
console.log('\n📖 Usage Instructions:');
console.log('1. Make sure the backend is running with WebSocket support');
console.log('2. Update TEST_EMAIL, TEST_PASSWORD, and TEST_DREAM_ID with valid values');
console.log('3. Run this script: npm run test:conversational-ws');
console.log('4. Type messages to chat with the interpreter');
console.log('5. Type "exit" to end the conversation\n');