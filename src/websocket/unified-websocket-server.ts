/**
 * Unified WebSocket Server
 * Manages all WebSocket connections using Socket.IO namespaces
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Namespace } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

// Import handlers
import { DreamInterpretationHandler } from '../dream-interpretation/websocket/dream-interpretation-handler';
import { ConversationalAIHandler } from '../conversational-ai/websocket/conversational-ai-handler';

interface AuthenticatedSocket {
  userId?: string;
  data?: any;
  handshake: any;
}

export class UnifiedWebSocketServer {
  private io: SocketIOServer;
  private dreamNamespace: Namespace;
  private conversationNamespace: Namespace;

  constructor(httpServer: HTTPServer) {
    // Create single Socket.IO server
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? process.env.FRONTEND_URL 
          : ['http://localhost:3000', 'http://localhost:3001'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    // Initialize namespaces
    this.dreamNamespace = this.io.of('/ws/dream');
    this.conversationNamespace = this.io.of('/ws/conversation');

    // Setup middleware and handlers
    this.setupAuthMiddleware();
    this.setupHandlers();

    logger.info('Unified WebSocket server initialized with namespaces:');
    logger.info('  - Dream interpretation: /ws/dream');
    logger.info('  - Conversational AI: /ws/conversation');
  }

  /**
   * Shared authentication middleware
   */
  private createAuthMiddleware() {
    return async (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
      try {
        const token = socket.handshake.auth?.token;
        
        if (!token) {
          return next(new Error('Authentication required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
        
        // Attach user info to socket
        socket.userId = decoded.userId || decoded.id;
        socket.data = { user: decoded };
        
        next();
      } catch (error) {
        logger.error('WebSocket authentication failed:', error);
        next(new Error('Authentication failed'));
      }
    };
  }

  /**
   * Setup authentication middleware for all namespaces
   */
  private setupAuthMiddleware(): void {
    const authMiddleware = this.createAuthMiddleware();
    
    // Apply to both namespaces
    this.dreamNamespace.use(authMiddleware);
    this.conversationNamespace.use(authMiddleware);
  }

  /**
   * Setup connection handlers for each namespace
   */
  private setupHandlers(): void {
    // Dream interpretation handler
    const dreamHandler = new DreamInterpretationHandler();
    this.dreamNamespace.on('connection', (socket) => {
      logger.info(`Dream interpretation client connected: ${socket.id}`);
      dreamHandler.handleConnection(socket);
    });

    // Conversational AI handler
    const conversationHandler = new ConversationalAIHandler();
    this.conversationNamespace.on('connection', (socket) => {
      logger.info(`Conversational AI client connected: ${socket.id}`);
      conversationHandler.handleConnection(socket);
    });
  }

  /**
   * Get Socket.IO server instance
   */
  getIO(): SocketIOServer {
    return this.io;
  }

  /**
   * Get specific namespace
   */
  getNamespace(name: string): Namespace {
    return this.io.of(name);
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down WebSocket server...');
    
    // Close all connections
    this.io.close(() => {
      logger.info('WebSocket server shut down');
    });
  }
}

// Factory function
export function createUnifiedWebSocketServer(httpServer: HTTPServer): UnifiedWebSocketServer {
  return new UnifiedWebSocketServer(httpServer);
}