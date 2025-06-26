/**
 * Interpreter Registry - Manages all available dream interpreters
 */

import { IDreamInterpreter } from './base/interpreter-interface';
import { InterpreterType } from '../types/extended';
import { JungDreamInterpreter } from './jung/jung-interpreter';
import { LakshmiDreamInterpreter } from './lakshmi/lakshmi-interpreter';
import { logger } from '../../utils/logger';

export class InterpreterRegistry {
  private static instance: InterpreterRegistry;
  private interpreters: Map<InterpreterType, IDreamInterpreter>;
  
  private constructor() {
    this.interpreters = new Map();
    this.registerDefaultInterpreters();
  }
  
  static getInstance(): InterpreterRegistry {
    if (!InterpreterRegistry.instance) {
      InterpreterRegistry.instance = new InterpreterRegistry();
    }
    return InterpreterRegistry.instance;
  }
  
  /**
   * Register default interpreters
   */
  private registerDefaultInterpreters() {
    this.register(new JungDreamInterpreter());
    this.register(new LakshmiDreamInterpreter());
    
    logger.info('Default interpreters registered', {
      interpreters: Array.from(this.interpreters.keys())
    });
  }
  
  /**
   * Register a new interpreter
   */
  register(interpreter: IDreamInterpreter): void {
    this.interpreters.set(interpreter.type, interpreter);
    logger.info(`Registered interpreter: ${interpreter.type}`, {
      metadata: interpreter.metadata
    });
  }
  
  /**
   * Get an interpreter by type
   */
  get(type: InterpreterType): IDreamInterpreter | undefined {
    return this.interpreters.get(type);
  }
  
  /**
   * Get all registered interpreters
   */
  getAll(): IDreamInterpreter[] {
    return Array.from(this.interpreters.values());
  }
  
  /**
   * Get all interpreter types
   */
  getTypes(): InterpreterType[] {
    return Array.from(this.interpreters.keys());
  }
  
  /**
   * Check if an interpreter is registered
   */
  has(type: InterpreterType): boolean {
    return this.interpreters.has(type);
  }
  
  /**
   * Get interpreter metadata
   */
  getMetadata(type: InterpreterType) {
    const interpreter = this.get(type);
    return interpreter ? {
      type: interpreter.type,
      metadata: interpreter.metadata,
      personality: interpreter.personality
    } : null;
  }
  
  /**
   * Unregister an interpreter (mainly for testing)
   */
  unregister(type: InterpreterType): boolean {
    return this.interpreters.delete(type);
  }
  
  /**
   * Clear all interpreters (mainly for testing)
   */
  clear(): void {
    this.interpreters.clear();
  }
}

// Export singleton instance
export const interpreterRegistry = InterpreterRegistry.getInstance();