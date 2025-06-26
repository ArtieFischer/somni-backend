/**
 * Main export file for the modular interpreter system
 */

// Base classes and interfaces
export * from './base/interpreter-interface';
export { BaseDreamInterpreter } from './base/base-interpreter';

// Specific interpreters
export { JungDreamInterpreter } from './jung/jung-interpreter';
export { LakshmiDreamInterpreter } from './lakshmi/lakshmi-interpreter';

// Registry
export { InterpreterRegistry, interpreterRegistry } from './registry';

// Re-export types for convenience
export type { 
  InterpreterContext,
  StageResult,
  RelevanceAssessment,
  FullInterpretationResult,
  FormattedInterpretation,
  IDreamInterpreter,
  InterpreterConfig
} from './base/interpreter-interface';