import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Server Configuration
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // ElevenLabs Configuration
  ELEVENLABS_API_KEY: z.string().min(1, 'ElevenLabs API key is required'),
  ELEVENLABS_AGENT_ID_JUNG: z.string().min(1, 'ElevenLabs Agent ID for Jung is required'),
  ELEVENLABS_AGENT_ID_FREUD: z.string().min(1, 'ElevenLabs Agent ID for Freud is required'),
  ELEVENLABS_AGENT_ID_LAKSHMI: z.string().min(1, 'ElevenLabs Agent ID for Lakshmi is required'),
  ELEVENLABS_AGENT_ID_MARY: z.string().min(1, 'ElevenLabs Agent ID for Mary is required'),
  
  // JWT Configuration
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  
  // OpenRouter Configuration
  OPENROUTER_API_KEY: z.string().min(1, 'OpenRouter API key is required'),
  OPENROUTER_SITE_URL: z.string().url().optional(),
  OPENROUTER_SITE_NAME: z.string().optional(),
  
  // Model Configuration
  MODEL_MAX_TOKENS: z.string().default('4000'),
  MODEL_TEMPERATURE: z.string().default('0.7'),
  MODEL_RETRY_ATTEMPTS: z.string().default('3'),
  MODEL_RETRY_DELAY_MS: z.string().default('1000'),
  
  // Cost Tracking
  COST_TRACKING_ENABLED: z.string().default('true'),
  COST_ALERT_THRESHOLD: z.string().default('10.0'), // USD
  
  // Supabase Configuration
  SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required'),
  SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  
  // Security Configuration
  API_SECRET_KEY: z.string().min(32, 'API secret key must be at least 32 characters'),
  ALLOWED_ORIGINS: z.string().default('*'),
  
  // Rate Limiting Configuration
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),
  
  // Optional Configuration
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  REQUEST_TIMEOUT_MS: z.string().default('30000'), // 30 seconds
  
  // Redis Configuration (optional for MVP)
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379')
});

// Parse and validate environment variables
const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Invalid environment configuration:');
  parseResult.error.issues.forEach((issue) => {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

export const config = {
  // Server
  port: parseInt(parseResult.data.PORT, 10),
  nodeEnv: parseResult.data.NODE_ENV,
  isDevelopment: parseResult.data.NODE_ENV === 'development',
  isProduction: parseResult.data.NODE_ENV === 'production',
  
  // ElevenLabs
  elevenLabs: {
    apiKey: parseResult.data.ELEVENLABS_API_KEY,
    agentIds: {
      jung: parseResult.data.ELEVENLABS_AGENT_ID_JUNG,
      freud: parseResult.data.ELEVENLABS_AGENT_ID_FREUD,
      lakshmi: parseResult.data.ELEVENLABS_AGENT_ID_LAKSHMI,
      mary: parseResult.data.ELEVENLABS_AGENT_ID_MARY,
    },
  },
  
  // JWT
  jwt: {
    secret: parseResult.data.JWT_SECRET,
  },
  
  // OpenRouter
  openRouter: {
    apiKey: parseResult.data.OPENROUTER_API_KEY,
    siteUrl: parseResult.data.OPENROUTER_SITE_URL,
    siteName: parseResult.data.OPENROUTER_SITE_NAME,
  },
  
  // Model Configuration
  models: {
    maxTokens: parseInt(parseResult.data.MODEL_MAX_TOKENS, 10),
    temperature: parseFloat(parseResult.data.MODEL_TEMPERATURE),
    retryAttempts: parseInt(parseResult.data.MODEL_RETRY_ATTEMPTS, 10),
    retryDelayMs: parseInt(parseResult.data.MODEL_RETRY_DELAY_MS, 10),
  },
  
  // Cost Tracking
  costTracking: {
    enabled: parseResult.data.COST_TRACKING_ENABLED.toLowerCase() === 'true',
    alertThreshold: parseFloat(parseResult.data.COST_ALERT_THRESHOLD),
  },
  
  // Supabase
  supabase: {
    url: parseResult.data.SUPABASE_URL,
    serviceRoleKey: parseResult.data.SUPABASE_SERVICE_ROLE_KEY,
    anonKey: parseResult.data.SUPABASE_ANON_KEY,
  },
  
  // Security
  security: {
    apiSecretKey: parseResult.data.API_SECRET_KEY,
    allowedOrigins: parseResult.data.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()),
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(parseResult.data.RATE_LIMIT_WINDOW_MS, 10),
    maxRequests: parseInt(parseResult.data.RATE_LIMIT_MAX_REQUESTS, 10),
  },
  
  // Optional
  logging: {
    level: parseResult.data.LOG_LEVEL,
  },
  
  request: {
    timeoutMs: parseInt(parseResult.data.REQUEST_TIMEOUT_MS, 10),
  },
  
  // Redis Configuration
  redis: {
    host: parseResult.data.REDIS_HOST,
    port: parseInt(parseResult.data.REDIS_PORT, 10),
  },
};

// Export individual config sections for convenience
export const {
  port,
  nodeEnv,
  isDevelopment,
  isProduction,
  elevenLabs,
  jwt,
  openRouter,
  models,
  costTracking,
  supabase,
  security,
  rateLimit,
  logging,
  request,
} = config; 