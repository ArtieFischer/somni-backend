/**
 * Test script for WebSocket implementation
 * This tests the dream interpretation WebSocket handler
 */

import { io, Socket } from 'socket.io-client';
import { InterpreterType } from './dream-interpretation/types';

const TEST_CONFIG = {
  serverUrl: 'http://localhost:3000',
  authToken: 'test-jwt-token', // You'll need to replace this with a valid token
  dreamId: 'test-dream-123',
  interpreterId: 'jung' as InterpreterType,
  testMessages: [
    'What does the flying in my dream mean?',
    'I often dream about water. Is this significant?',
    'Can you explain the symbolism of the house in my dream?'
  ]
};

interface ServerToClientEvents {
  conversationStarted: (data: {
    sessionId: string;
    conversationId: string;
    interpreterId: InterpreterType;
  }) => void;
  
  agentResponse: (data: {
    response: string;
    metadata?: any;
  }) => void;
  
  conversationEnded: (data: {
    reason: string;
    summary?: string;
  }) => void;
  
  error: (data: {
    code: string;
    message: string;
  }) => void;
  
  agentTyping: (data: {
    isTyping: boolean;
  }) => void;
  
  connectionStatus: (data: {
    status: string;
  }) => void;
}

interface ClientToServerEvents {
  startConversation: (data: {
    dreamId: string;
    interpreterId: InterpreterType;
    dreamInterpretation?: string;
    userName?: string;
    initialMessage?: string;
  }) => void;
  
  sendMessage: (data: {
    message: string;
  }) => void;
  
  endConversation: () => void;
  
  typing: (data: {
    isTyping: boolean;
  }) => void;
}

class WebSocketTester {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private messageIndex = 0;
  
  async connect(): Promise<void> {
    console.log('🔌 Connecting to WebSocket server...');
    
    this.socket = io(TEST_CONFIG.serverUrl, {
      auth: {
        token: TEST_CONFIG.authToken
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000
    });
    
    this.setupEventHandlers();
    
    return new Promise((resolve, reject) => {
      this.socket!.on('connect', () => {
        console.log('✅ Connected to WebSocket server');
        resolve();
      });
      
      this.socket!.on('connect_error', (error) => {
        console.error('❌ Connection error:', error.message);
        reject(error);
      });
      
      // Timeout after 10 seconds
      setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);
    });
  }
  
  private setupEventHandlers(): void {
    if (!this.socket) return;
    
    // Connection status
    this.socket.on('connectionStatus', (data) => {
      console.log('📡 Connection status:', data.status);
    });
    
    // Conversation started
    this.socket.on('conversationStarted', (data) => {
      console.log('🎭 Conversation started:', data);
      console.log(`  Session ID: ${data.sessionId}`);
      console.log(`  Conversation ID: ${data.conversationId}`);
      console.log(`  Interpreter: ${data.interpreterId}`);
      
      // Send first message
      this.sendNextMessage();
    });
    
    // Agent response
    this.socket.on('agentResponse', (data) => {
      console.log('\n🤖 Agent response:');
      console.log(data.response);
      
      if (data.metadata) {
        console.log('📊 Metadata:', data.metadata);
      }
      
      // Send next message after a delay
      setTimeout(() => {
        this.sendNextMessage();
      }, 2000);
    });
    
    // Agent typing
    this.socket.on('agentTyping', (data) => {
      if (data.isTyping) {
        console.log('💭 Agent is typing...');
      }
    });
    
    // Conversation ended
    this.socket.on('conversationEnded', (data) => {
      console.log('\n🏁 Conversation ended:', data);
      this.disconnect();
    });
    
    // Errors
    this.socket.on('error', (data) => {
      console.error('❌ Error:', data);
    });
    
    // Socket errors
    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected:', reason);
    });
  }
  
  async startConversation(): Promise<void> {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    
    console.log('\n🚀 Starting conversation...');
    
    this.socket.emit('startConversation', {
      dreamId: TEST_CONFIG.dreamId,
      interpreterId: TEST_CONFIG.interpreterId,
      dreamInterpretation: 'You were flying over a vast ocean and then found yourself in a childhood home.',
      userName: 'Test User'
    });
  }
  
  private sendNextMessage(): void {
    if (!this.socket || this.messageIndex >= TEST_CONFIG.testMessages.length) {
      // No more messages, end conversation
      this.endConversation();
      return;
    }
    
    const message = TEST_CONFIG.testMessages[this.messageIndex];
    this.messageIndex++;
    
    console.log(`\n💬 Sending message ${this.messageIndex}/${TEST_CONFIG.testMessages.length}: "${message}"`);
    
    // Show typing indicator
    this.socket.emit('typing', { isTyping: true });
    
    setTimeout(() => {
      this.socket!.emit('typing', { isTyping: false });
      this.socket!.emit('sendMessage', { message });
    }, 1000);
  }
  
  private endConversation(): void {
    if (!this.socket) return;
    
    console.log('\n👋 Ending conversation...');
    this.socket.emit('endConversation');
  }
  
  private disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    console.log('\n✅ Test completed');
    process.exit(0);
  }
}

// Main test function
async function runTest() {
  console.log('🧪 WebSocket Test Script');
  console.log('========================');
  console.log('Server URL:', TEST_CONFIG.serverUrl);
  console.log('Interpreter:', TEST_CONFIG.interpreterId);
  console.log('');
  
  const tester = new WebSocketTester();
  
  try {
    // Connect to server
    await tester.connect();
    
    // Start conversation
    await tester.startConversation();
    
    // The rest happens through event handlers
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
runTest().catch(console.error);

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⚠️  Test interrupted');
  process.exit(0);
});