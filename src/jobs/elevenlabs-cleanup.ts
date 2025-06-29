import { ElevenLabsSessionService } from '../services/elevenlabs-session.service';
import { logger } from '../utils/logger';

/**
 * Clean up expired ElevenLabs sessions
 * This should be called periodically (e.g., every hour) to remove expired sessions
 */
export async function cleanupExpiredSessions(): Promise<void> {
  try {
    logger.info('Starting ElevenLabs session cleanup...');
    
    const cleanedCount = await ElevenLabsSessionService.cleanupExpiredSessions();
    
    if (cleanedCount > 0) {
      logger.info(`ElevenLabs cleanup completed: ${cleanedCount} sessions removed`);
    } else {
      logger.debug('ElevenLabs cleanup: No expired sessions found');
    }
  } catch (error) {
    logger.error('ElevenLabs cleanup job failed:', error);
    throw error;
  }
}

/**
 * Start periodic cleanup job
 * Can be called from server startup or scheduled via cron
 */
export function startElevenLabsCleanupJob(): void {
  // Run cleanup every hour
  const intervalMs = 60 * 60 * 1000; // 1 hour
  
  // Run immediately on startup
  cleanupExpiredSessions().catch(error => {
    logger.error('Initial ElevenLabs cleanup failed:', error);
  });
  
  // Schedule periodic cleanup
  setInterval(() => {
    cleanupExpiredSessions().catch(error => {
      logger.error('Scheduled ElevenLabs cleanup failed:', error);
    });
  }, intervalMs);
  
  logger.info('ElevenLabs cleanup job scheduled to run every hour');
}