import { logger } from '../../../utils/logger';

/**
 * Simplified state manager for Mary (Neuroscientist) that prevents repetition
 */
export class SimpleMaryStateManager {
  private static instance: SimpleMaryStateManager;
  
  // Track last N interpretations with their signatures
  private recentInterpretations: string[] = [];
  private maxHistory = 20;
  
  // Track which approaches were used
  private approachHistory: string[] = [];
  private maxApproachHistory = 10;
  
  // Track opening phrases to prevent repetition
  private recentOpenings: string[] = [];
  private maxOpeningHistory = 10;
  
  private constructor() {
    logger.info('SimpleMaryStateManager initialized');
  }
  
  static getInstance(): SimpleMaryStateManager {
    if (!this.instance) {
      this.instance = new SimpleMaryStateManager();
    }
    return this.instance;
  }
  
  /**
   * Get an approach that hasn't been used recently
   * FORCES variety by throwing error if all approaches used recently
   */
  getNextApproach(availableApproaches: string[]): string {
    // Find approaches not used in recent history
    const unusedApproaches = availableApproaches.filter(
      approach => !this.approachHistory.includes(approach)
    );
    
    if (unusedApproaches.length === 0) {
      // All approaches used recently - clear oldest and try again
      this.approachHistory = this.approachHistory.slice(-5);
      return this.getNextApproach(availableApproaches);
    }
    
    // Pick random from unused approaches
    const selected = unusedApproaches[Math.floor(Math.random() * unusedApproaches.length)]!;
    
    // Track usage
    this.approachHistory.push(selected);
    if (this.approachHistory.length > this.maxApproachHistory) {
      this.approachHistory.shift();
    }
    
    logger.info('Selected approach', { 
      approach: selected, 
      recentHistory: this.approachHistory.slice(-5) 
    });
    
    return selected;
  }
  
  /**
   * Check if an interpretation signature was used recently
   * Returns true if it should be BLOCKED
   */
  isSignatureBlocked(signature: string): boolean {
    const isBlocked = this.recentInterpretations.includes(signature);
    
    if (isBlocked) {
      logger.warn('Blocked repetitive signature', { signature });
    }
    
    return isBlocked;
  }
  
  /**
   * Track an interpretation signature
   */
  trackInterpretation(signature: string): void {
    this.recentInterpretations.push(signature);
    
    // Keep only recent history
    if (this.recentInterpretations.length > this.maxHistory) {
      this.recentInterpretations.shift();
    }
    
    logger.info('Tracked interpretation', {
      signature,
      historySize: this.recentInterpretations.length
    });
  }
  
  /**
   * Generate interpretation signature from components
   */
  generateSignature(approach: string, primaryFocus: string, structure: string): string {
    return `${approach}-${primaryFocus}-${structure}`;
  }
  
  /**
   * Get forbidden patterns to avoid
   */
  getForbiddenPatterns(): string[] {
    // Extract patterns from recent interpretations
    const patterns = new Set<string>();
    
    this.recentInterpretations.slice(-5).forEach(sig => {
      const parts = sig.split('-');
      if (parts[0]) patterns.add(parts[0]);
      if (parts[1]) patterns.add(parts[1]);
    });
    
    return Array.from(patterns);
  }
  
  /**
   * Track interpretation opening
   */
  trackOpening(opening: string): void {
    const firstWords = opening.split(' ').slice(0, 3).join(' ').toLowerCase();
    this.recentOpenings.push(firstWords);
    
    if (this.recentOpenings.length > this.maxOpeningHistory) {
      this.recentOpenings.shift();
    }
  }
  
  /**
   * Get forbidden opening patterns
   */
  getForbiddenOpenings(): string[] {
    return [
      ...this.recentOpenings.map(opening => 
        `Do NOT start with "${opening}"`
      ),
      'Do NOT start with "From a neuroscientific perspective"',
      'Do NOT start with "Your brain"',
      'Do NOT start with "This dream shows"',
      'Do NOT start with "The neural patterns"',
      'Do NOT start with "Recent research"'
    ];
  }
  
  /**
   * Reset state (for testing)
   */
  reset(): void {
    this.recentInterpretations = [];
    this.approachHistory = [];
    this.recentOpenings = [];
    logger.info('SimpleMaryStateManager reset');
  }
}