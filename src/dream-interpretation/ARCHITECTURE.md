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
- **Freud**: Psychoanalytic approach exploring unconscious desires and defense mechanisms
- **Mary**: Neuroscientific perspective on dream brain activity and memory consolidation

## Knowledge Retrieval System

### Theme-Based Knowledge Retrieval
- **Service**: `services/theme-knowledge-retriever.ts`
- **Purpose**: Retrieves relevant knowledge fragments based on dream themes
- **Features**:
  - BGE-M3 embeddings for semantic matching
  - Fragment similarity threshold (0.3)
  - Top 10 fragments retrieved before quality control
  - Max 3 fragments selected after relevance assessment
  - Fragment IDs tracked for future AI memory features

### Knowledge Fragment Structure
```typescript
interface KnowledgeFragment {
  id: string;
  content: string;
  source: string;
  interpreter: InterpreterType;
  themes: string[];
  relevanceScore?: number;
  metadata?: Record<string, any>;
}
```

## API Integration

### Endpoints

1. **POST /api/v1/dreams/interpret-by-id**
   - Accepts `dreamId`, `userId`, `interpreterType`
   - Fetches all data from database
   - Generates interpretation
   - Saves to interpretations table
   - Returns full interpretation

2. **POST /api/v1/dreams/interpret**
   - Legacy endpoint accepting full dream transcription
   - Used for testing and direct interpretation

3. **POST /api/v1/dreams/interpret-async** (Queue-based)
   - Queues interpretation for background processing
   - Returns job ID and queue position
   - Supports push notifications

4. **GET /api/v1/dreams/interpretation-status/:jobId**
   - Check status of queued interpretation

5. **GET /api/v1/dreams/:dreamId/interpretations**
   - Get all interpretations for a dream

6. **GET /api/v1/dreams/interpreters**
   - List available interpreters with metadata

## Database Schema

### Interpretations Table
```sql
CREATE TABLE interpretations (
  id UUID PRIMARY KEY,
  dream_id UUID REFERENCES dreams(id),
  user_id UUID REFERENCES profiles(user_id),
  interpreter_type TEXT,
  
  -- Content
  interpretation_summary TEXT,  -- 2-3 paragraph summary
  full_response JSONB,         -- Complete JSON response
  
  -- Extracted fields
  dream_topic TEXT,
  quick_take TEXT,
  symbols TEXT[],
  emotional_tone JSONB,        -- {primary, secondary, intensity}
  primary_insight TEXT,
  key_pattern TEXT,
  
  -- Metadata
  knowledge_fragments_used INTEGER,
  total_fragments_retrieved INTEGER,
  fragment_ids_used TEXT[],    -- Track which fragments were used
  processing_time_ms INTEGER,
  model_used TEXT,
  
  -- Timestamps & versioning
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  version INTEGER,
  previous_version_id UUID
);
```

### Key Features:
- Full JSON response stored for flexibility
- Extracted fields for efficient querying
- Fragment IDs tracked for future "interpreter memory"
- Support for re-interpretations with versioning
- Row Level Security enabled

## Three-Stage Process Details

### Stage 1: Relevance Assessment
- Temperature: 0.3 (low for consistency)
- Max tokens: 1500
- Selects up to 3 most relevant fragments
- Identifies focus areas for interpretation

### Stage 2: Full Interpretation
- Temperature: 0.7 (balanced creativity)
- Max tokens: 3000
- 400-600 word interpretation
- Incorporates relevant knowledge fragments
- Uses interpreter-specific perspective

### Stage 3: JSON Formatting
- Temperature: 0.2 (very low for structure)
- Max tokens: 2000
- Structures interpretation into digestible format
- Ensures consistent output across interpreters

## Interpreter-Specific Features

### Jung
- Archetypal analysis (Shadow, Anima/Animus, Self)
- Compensatory function of dreams
- Individuation process insights
- Collective unconscious themes

### Lakshmi
- Karmic patterns and soul lessons
- Chakra analysis
- Sanskrit concepts with translations
- Spiritual guidance and practices

### Freud
- Manifest vs latent content
- Dream-work mechanisms
- Defense mechanisms
- Psychosexual development stages

### Mary
- Brain region activity
- Sleep stage characteristics
- Neurotransmitter dynamics
- Memory consolidation processes

## Quality Control

### Fragment Selection
- Max 4 domain-specific terms per interpretation
- Max 3 knowledge fragments after quality control
- Relevance scoring and filtering

### Validation
- Each interpreter validates its own output
- Required fields checking
- Authenticity markers tracking

## Testing

### Available Test Scripts
```bash
# Test all interpreters
npm run test:all-interpreters

# Test single interpreter
npm run test:single-interpreter

# Test modular system
npm run test:modular

# Interactive test
npm run test:interactive
```

## Frontend Integration

### Synchronous Approach
```typescript
const response = await fetch('/api/v1/dreams/interpret-by-id', {
  method: 'POST',
  body: JSON.stringify({ dreamId, userId, interpreterType })
});
```

### Asynchronous Queue Approach
```typescript
// Queue interpretation
const { jobId } = await queueInterpretation(dreamId, userId, interpreterType);

// Subscribe to real-time updates
supabase.channel(`dream-${dreamId}`)
  .on('postgres_changes', { 
    event: 'INSERT', 
    table: 'interpretations' 
  }, handleNewInterpretation)
  .subscribe();
```

## Performance Optimizations

- Fragment retrieval limited to top 10
- Interpreter-specific filtering at database level
- Indexed searches on themes and symbols
- Caching of frequently used fragments (planned)

## Future Enhancements

- Plugin system for external interpreters
- Interpreter composition (combining multiple perspectives)
- Dynamic prompt optimization based on success metrics
- Fragment effectiveness tracking
- Interpreter memory based on fragment usage patterns
- Multi-language support
- Voice-based interpretation delivery