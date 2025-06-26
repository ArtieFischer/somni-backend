# Modular Dream Interpretation System

## Overview

The dream interpretation system uses a modular, extensible architecture that makes it easy to add new interpreters while maintaining consistent behavior across all implementations.

## Architecture

### Core Components

1. **Base Interpreter Interface** (`interpreters/base/interpreter-interface.ts`)
   - Defines the contract all interpreters must implement
   - Ensures consistent behavior across different interpretation styles

2. **Base Interpreter Class** (`interpreters/base/base-interpreter.ts`)
   - Abstract class providing common functionality
   - Handles the three-stage process flow
   - Manages OpenRouter integration

3. **Interpreter Registry** (`interpreters/registry.ts`)
   - Central registry for all available interpreters
   - Singleton pattern for global access
   - Automatic registration of default interpreters

4. **Modular Three-Stage Service** (`services/modular-three-stage-interpreter.ts`)
   - Main service orchestrating the interpretation process
   - Uses registry to get appropriate interpreter
   - Handles knowledge retrieval and metadata

### Three-Stage Process

1. **Stage 1: Relevance Assessment**
   - Analyzes themes and knowledge fragments
   - Filters relevant information
   - Determines focus areas

2. **Stage 2: Full Interpretation**
   - Generates comprehensive interpretation
   - Uses interpreter's unique perspective
   - Incorporates relevant knowledge

3. **Stage 3: JSON Formatting**
   - Structures interpretation into digestible format
   - Adds metadata and insights
   - Ensures consistent output

## Adding a New Interpreter

### 1. Create Interpreter Directory

```
src/dream-interpretation/interpreters/
└── your-interpreter/
    ├── your-interpreter.ts
    └── your-prompts.ts
```

### 2. Implement the Interpreter

```typescript
import { BaseDreamInterpreter } from '../base/base-interpreter';
import { InterpreterConfig } from '../base/interpreter-interface';
import { yourPrompts } from './your-prompts';

export class YourDreamInterpreter extends BaseDreamInterpreter {
  constructor(config?: Partial<InterpreterConfig>) {
    super({
      type: 'your-type', // Must match InterpreterType
      metadata: {
        name: 'Your Interpreter Name',
        description: 'Brief description',
        strengths: ['strength1', 'strength2'],
        approach: 'Your approach description'
      },
      personality: {
        name: 'Interpreter Name',
        description: 'who you are',
        voiceSignature: 'Your unique voice',
        traits: ['trait1', 'trait2'],
        languagePatterns: ['pattern1', 'pattern2']
      },
      ...config
    });
  }
  
  protected getRelevancePrompt(): string {
    return yourPrompts.relevanceAssessment;
  }
  
  protected getInterpretationPrompt(): string {
    return yourPrompts.fullInterpretation;
  }
  
  protected getFormattingPrompt(): string {
    return yourPrompts.jsonFormatting;
  }
  
  protected validateInterpreterSpecific(interpretation: DreamInterpretation): string[] {
    // Your validation logic
    return [];
  }
  
  getCoreStructure(): InterpretationCore {
    // Return your core structure
    return {
      type: 'your-type',
      // ... your fields
    };
  }
}
```

### 3. Define Prompts

```typescript
export const yourPrompts = {
  relevanceAssessment: `...`,
  fullInterpretation: `...`,
  jsonFormatting: `...`
};
```

### 4. Register the Interpreter

The interpreter will be automatically registered if you add it to the registry's `registerDefaultInterpreters` method, or you can register it dynamically:

```typescript
import { YourDreamInterpreter } from './interpreters/your-interpreter/your-interpreter';
import { modularThreeStageInterpreter } from './services/modular-three-stage-interpreter';

// Register new interpreter
modularThreeStageInterpreter.registerInterpreter(new YourDreamInterpreter());
```

## Usage

```typescript
import { modularThreeStageInterpreter } from './services/modular-three-stage-interpreter';

const interpretation = await modularThreeStageInterpreter.interpretDream({
  dreamId: 'dream-123',
  userId: 'user-456',
  dreamTranscription: 'I had a dream about...',
  interpreterType: 'jung', // or 'lakshmi', or your custom type
  themes: [
    { code: 'water', name: 'Water', relevanceScore: 0.9 }
  ],
  userContext: {
    age: 30,
    currentLifeSituation: 'seeking guidance'
  }
});
```

## Testing

Run tests with:

```bash
npm run test:modular
```

## Benefits of Modular Architecture

1. **Easy Extension**: Add new interpreters without modifying core code
2. **Consistent Behavior**: All interpreters follow the same process
3. **Type Safety**: Strong typing throughout the system
4. **Maintainability**: Clear separation of concerns
5. **Testability**: Each component can be tested independently
6. **Flexibility**: Easy to swap interpreters at runtime

## Available Interpreters

- **Jung**: Analytical psychology focusing on archetypes and individuation
- **Lakshmi**: Vedantic and yogic approach with spiritual insights

## Future Enhancements

- Plugin system for external interpreters
- Interpreter composition (combining multiple perspectives)
- Dynamic prompt optimization
- Performance metrics per interpreter
- A/B testing framework