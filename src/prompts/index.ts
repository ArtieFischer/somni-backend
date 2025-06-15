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

// Interpreter-specific exports
export { JungianPromptBuilder } from './interpreters/jung/builder'; 