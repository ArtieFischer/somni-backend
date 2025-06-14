import winston from 'winston';
import { config } from '../config';

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Create custom format for development
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    // Add stack trace for errors
    if (stack) {
      log += `\n${stack}`;
    }
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Create custom format for production
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create the logger instance
export const logger = winston.createLogger({
  levels: logLevels,
  level: config.logging.level,
  format: config.isProduction ? productionFormat : developmentFormat,
  defaultMeta: {
    service: 'somni-backend',
    version: process.env['npm_package_version'] || '1.0.0',
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
  exitOnError: false,
});

// Add file transports for production
if (config.isProduction) {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 10,
  }));
  
  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
    maxsize: 5242880, // 5MB
    maxFiles: 10,
  }));
}

// Create stream for Morgan HTTP request logging
export const logStream = {
  write: (message: string) => {
    // Remove trailing newline from Morgan and log as info
    logger.info(message.trim());
  },
};

// Helper function for request/response logging
export const logRequest = (
  method: string,
  url: string,
  statusCode: number,
  responseTime: number,
  userAgent?: string,
  userId?: string
) => {
  logger.info('HTTP Request', {
    method,
    url,
    statusCode,
    responseTime: `${responseTime}ms`,
    userAgent,
    userId,
  });
};

// Helper function for error logging with context
export const logError = (
  error: Error,
  context?: Record<string, any>
) => {
  logger.error('Application Error', {
    message: error.message,
    stack: error.stack,
    name: error.name,
    ...context,
  });
};

// Helper function for transcription-specific logging
export const logTranscription = (
  event: 'started' | 'completed' | 'failed',
  dreamId: string,
  userId?: string,
  metadata?: Record<string, any>
) => {
  logger.info(`Transcription ${event}`, {
    dreamId,
    userId,
    event,
    ...metadata,
  });
};

export default logger; 