import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { logger } from './utils/logger';
import { attachUserContext } from './middleware/auth';
import { generalRateLimit } from './middleware/rateLimit';
import { healthRouter } from './routes/health';
import { transcriptionRouter } from './routes/transcription';

const app = express();

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

// Start server
app.listen(config.port, () => {
  logger.info(`Somni Backend Service started on port ${config.port}`);
});

export default app; 