import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { logger } from './utils/logger';

// Log startup immediately
console.log('=== SOMNI BACKEND STARTING ===');
console.log('Environment:', process.env.NODE_ENV);
console.log('Port:', process.env.PORT || 3000);
console.log('Timestamp:', new Date().toISOString());

logger.info('Somni backend initializing', {
  env: process.env.NODE_ENV,
  port: config.port,
  nodeVersion: process.version
});
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
import elevenlabsRouter from './routes/elevenlabs';
import dreamSharingRouter from './routes/dream-sharing';

const app = express();

// Immediate health check endpoint (before any middleware)
app.get('/', (_req, res) => {
  console.log('Root endpoint hit at:', new Date().toISOString());
  res.json({ 
    status: 'alive',
    service: 'somni-backend',
    timestamp: new Date().toISOString()
  });
});

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: config.security.allowedOrigins.includes('*') 
    ? true 
    : config.security.allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
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
app.use('/api/v1/debug-embedding-jobs', debugEmbeddingJobsRouter);
app.use('/api/v1/debug-embedding', debugEmbeddingRouter);
app.use('/api/v1/debug-service-role', debugServiceRoleRouter);
app.use('/api/v1/conversations/elevenlabs', elevenlabsRouter);
app.use('/api/v1', dreamSharingRouter);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    service: 'somni-backend',
    status: 'operational',
    timestamp: new Date().toISOString(),
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

// Import cleanup job
import { startElevenLabsCleanupJob } from './jobs/elevenlabs-cleanup';

// Start server
app.listen(config.port, () => {
  logger.info(`Somni Backend Service started on port ${config.port}`);
  
  // Start embedding worker
  embeddingWorker.start();
  logger.info('Dream embedding worker started');
  
  // Start ElevenLabs cleanup job
  startElevenLabsCleanupJob();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  embeddingWorker.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  embeddingWorker.stop();
  process.exit(0);
});

export default app; 