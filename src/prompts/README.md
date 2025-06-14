# Prompts Architecture

This directory contains the reorganized prompt building and interpretation system, designed for clean separation of concerns and modular functionality.

## Structure

```
src/prompts/
├── index.ts                    # Main exports
├── README.md                   # This file
├── base.ts                     # Base prompt builder class (306 lines)
├── factory.ts                  # Factory and service classes (55 lines)
├── themes.ts                   # Universal dream themes (72 lines)
├── interpretation.ts           # Response parsing utilities (299 lines)
├── test-utils.ts              # Testing utilities (277 lines)
└── interpreters/
    └── jung/
        └── builder.ts          # Jungian prompt builder (143 lines)
```

## Design Principles

1. **Modular Architecture**: Each file has a specific responsibility and is kept under 350 lines
2. **Clean Separation**: General prompt utils at root level, interpreter-specific code in subdirectories
3. **Type Safety**: Comprehensive TypeScript interfaces and strong typing
4. **Testability**: Dedicated test utilities and clear interfaces for testing

## File Responsibilities

### Core Files (src/prompts/)

- **`base.ts`**: Abstract base class for all prompt builders, universal theme extraction
- **`factory.ts`**: Factory pattern for creating prompt builders, main service interface
- **`themes.ts`**: Universal dream themes and symbols that work across all interpreters
- **`interpretation.ts`**: Response parsing logic for all interpreter types
- **`test-utils.ts`**: Comprehensive testing utilities for prompt functionality
- **`index.ts`**: Clean exports for external consumption

### Interpreter-Specific Files

- **`interpreters/jung/builder.ts`**: Jungian-specific prompt building logic
- Future: `interpreters/freud/`, `interpreters/neuroscientist/`, etc.

## Usage Examples

### Basic Usage

```typescript
import { PromptBuilderService } from "../prompts";

const template = await PromptBuilderService.buildInterpretationPrompt({
  dreamTranscription: "I was flying over the ocean...",
  interpreterType: "jung",
  analysisDepth: "deep",
});
```

### Response Parsing

```typescript
import { InterpretationParser } from "../prompts";

const insights = await InterpretationParser.parseInterpretationResponse(
  aiResponse,
  "jung"
);
```

### Testing

```typescript
import { PromptBuilderTestUtil } from "../prompts";

PromptBuilderTestUtil.quickTest("I dreamed of flying over water");
```

## Benefits of This Structure

1. **Maintainability**: Smaller, focused files are easier to understand and modify
2. **Extensibility**: Adding new interpreters follows a clear pattern
3. **Reusability**: Core prompt building logic is shared across interpreters
4. **Testability**: Each component can be tested independently
5. **Performance**: Only load what you need through selective imports

## Migration Notes

- Old `src/services/promptBuilder.ts` (442 lines) → Split into multiple focused files
- Old `src/services/promptBuilder/JungianPromptBuilder.ts` → `src/prompts/interpreters/jung/builder.ts`
- Old `src/utils/promptBuilderTestUtil.ts` → `src/prompts/test-utils.ts`
- Interpretation service updated to use modular imports
