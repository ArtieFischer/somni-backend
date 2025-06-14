// Main service (consolidated entry point)
export { dreamInterpretationService, DreamInterpretationService } from './service';

// Modular components
export { PromptBuilderService, PromptBuilderFactory } from './factory';
export { BasePromptBuilder } from './base';
export { InterpretationParser } from './interpretation';
export { PromptBuilderTestUtil } from './test-utils';

// Universal themes and types
export { UNIVERSAL_THEMES } from './themes';
export type { UniversalTheme } from './themes';

// Core types
export type { 
  DreamAnalysisRequest, 
  UniversalDreamElements, 
  PromptTemplate 
} from './base';

// Interpreter-specific exports
export { JungianPromptBuilder } from './interpreters/jung/builder'; 