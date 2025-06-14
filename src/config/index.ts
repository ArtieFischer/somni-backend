import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Server Configuration
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // ElevenLabs Configuration
  ELEVENLABS_API_KEY: z.string().min(1, 'ElevenLabs API key is required'),
  
  // OpenRouter Configuration
  OPENROUTER_API_KEY: z.string().min(1, 'OpenRouter API key is required'),
  OPENROUTER_DEFAULT_MODEL: z.string().default('meta-llama/llama-3.1-8b-instruct:free'),
  OPENROUTER_SITE_URL: z.string().url().optional(),
  OPENROUTER_SITE_NAME: z.string().optional(),
  
  // Supabase Configuration
  SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required'),
  
  // Security Configuration
  API_SECRET_KEY: z.string().min(32, 'API secret key must be at least 32 characters'),
  ALLOWED_ORIGINS: z.string().default('*'),
  
  // Rate Limiting Configuration
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),
  
  // Optional Configuration
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  REQUEST_TIMEOUT_MS: z.string().default('30000'), // 30 seconds
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
  },
  
  // OpenRouter
  openRouter: {
    apiKey: parseResult.data.OPENROUTER_API_KEY,
    defaultModel: parseResult.data.OPENROUTER_DEFAULT_MODEL,
    siteUrl: parseResult.data.OPENROUTER_SITE_URL,
    siteName: parseResult.data.OPENROUTER_SITE_NAME,
  },
  
  // Supabase
  supabase: {
    url: parseResult.data.SUPABASE_URL,
    serviceRoleKey: parseResult.data.SUPABASE_SERVICE_ROLE_KEY,
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
};

// Export individual config sections for convenience
export const {
  port,
  nodeEnv,
  isDevelopment,
  isProduction,
  elevenLabs,
  openRouter,
  supabase,
  security,
  rateLimit,
  logging,
  request,
} = config; 