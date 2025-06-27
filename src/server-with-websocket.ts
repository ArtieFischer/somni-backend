import 'express-async-errors';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { logger } from './utils/logger';
import { attachUserContext } from './middleware/auth';
import { generalRateLimit } from './middleware/rateLimit';
import { healthRouter } from './routes/health';
import { transcriptionRouter } from './routes/transcription';
import { testModelsRouter } from './routes/test-models';
import interpretationRouter from './routes/interpretation';
import ragDebugRouter from './routes/rag-debug';
import { sceneDescriptionRouter } from './routes/scene-description';
import embeddingsRouter from './routes/embeddings';
import embeddingsSimpleRouter from './routes/embeddings-simple';
import { dreamEmbeddingRouter } from './routes/dreamEmbedding';
import { debugEmbeddingJobsRouter } from './routes/debug-embedding-jobs';
import { embeddingWorker } from './workers/embeddingWorker';
import { debugEmbeddingRouter } from './routes/debugEmbedding';
import { debugServiceRoleRouter } from './routes/debugServiceRole';
import { dreamInterpretationRouter } from './routes/dream-interpretation';
import { conversationRouter } from './routes/conversation';
import { createUnifiedWebSocketServer } from './websocket/unified-websocket-server';
import { conversationRouter as conversationalAIRouter } from './conversational-ai/api/conversation.controller';

const app = express();

// Create HTTP server
const httpServer = createServer(app);

// Initialize unified WebSocket server with namespaces
const unifiedWebSocketServer = createUnifiedWebSocketServer(httpServer);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: config.security.allowedOrigins.includes('*') 
    ? true 
    : config.security.allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization', 
    'X-API-Secret',
    'X-Supabase-Token',
  ],
}));

// Request parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Trust proxy
app.set('trust proxy', 1);

// Middleware
app.use(attachUserContext);
app.use(generalRateLimit);

// Routes
app.use('/health', healthRouter);
app.use('/api/v1/transcription', transcriptionRouter);
app.use('/api/v1/interpretation', interpretationRouter);
app.use('/api/v1/test', testModelsRouter);
app.use('/api/v1/rag-debug', ragDebugRouter);
app.use('/api/v1/scene-description', sceneDescriptionRouter);
app.use('/api/v1/embeddings', embeddingsRouter);
app.use('/api/v1/themes', embeddingsSimpleRouter);
app.use('/api/v1/dream-embeddings', dreamEmbeddingRouter);
app.use('/api/v1/dreams', dreamInterpretationRouter);
app.use('/api/v1/conversations', conversationRouter);
app.use('/api/conversations', conversationalAIRouter); // Conversational AI endpoints
app.use('/api/v1/debug-embedding-jobs', debugEmbeddingJobsRouter);
app.use('/api/v1/debug-embedding', debugEmbeddingRouter);
app.use('/api/v1/debug-service-role', debugServiceRoleRouter);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    service: 'somni-backend',
    status: 'operational',
    timestamp: new Date().toISOString(),
    features: {
      dreamInterpretation: true,
      conversationalAI: true,
      webSocket: true
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
  });
});

// Error handler
app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { error: error.message });
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
httpServer.listen(config.port, () => {
  logger.info(`Somni Backend Service started on port ${config.port}`);
  logger.info('WebSocket servers initialized:');
  logger.info('  - Dream interpretation WebSocket: /ws');
  logger.info('  - Conversational AI WebSocket: /ws/conversation');
  
  // Start embedding worker
  embeddingWorker.start();
  logger.info('Dream embedding worker started');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing servers');
  
  // Shutdown unified WebSocket server
  await unifiedWebSocketServer.shutdown();
  
  // Stop embedding worker
  embeddingWorker.stop();
  
  // Close HTTP server
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing servers');
  
  // Shutdown unified WebSocket server
  await unifiedWebSocketServer.shutdown();
  
  // Stop embedding worker
  embeddingWorker.stop();
  
  // Close HTTP server
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export default app;
export { httpServer, unifiedWebSocketServer };