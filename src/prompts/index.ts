// Main service (consolidated entry point)
export { dreamInterpretationService, DreamInterpretationService } from './service';

// Modular components
export { PromptBuilderService, PromptBuilderFactory } from './factory';
export { BasePromptBuilder } from './base';
export { InterpretationParser } from './interpretation';

// Core types
export type { 
  DreamAnalysisRequest, 
  PromptTemplate 
} from './base';

// Interpreter-specific exports (modular architecture)
export { JungianPromptBuilder, JungianInterpreter } from './interpreters/jung';
export { FreudianPromptBuilder, FreudianInterpreter } from './interpreters/freud'; 