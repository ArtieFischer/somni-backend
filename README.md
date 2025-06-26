# Somni Backend Service - ElevenLabs Integration Layer

A dedicated backend service that acts as a secure gateway for ElevenLabs transcription services, designed to integrate seamlessly with the Somni mobile app via Supabase Edge Functions.

## 🏗️ Architecture

```
Mobile App → Supabase Edge Functions → Somni Backend Service → ElevenLabs APIs
                    ↑                           │
                    └───────────────────────────┘
                         (Database Updates)
```

## 🚀 Features

### Core Services
- **Secure API Gateway**: Dual authentication (API secret + Supabase JWT)
- **ElevenLabs Integration**: Speech-to-text transcription using `scribe_v1` model
- **Database Management**: Direct Supabase integration for dream record updates
- **Comprehensive Logging**: Structured JSON logging with Winston
- **Rate Limiting**: Configurable rate limits with user-based keys
- **Health Monitoring**: Multiple health check endpoints for monitoring
- **Error Handling**: Detailed error mapping and user-friendly messages
- **Audio Validation**: File size and format validation before processing
- **Usage Tracking**: Transcription usage recording for billing/analytics

### Dream Interpretation System
- **Four AI Interpreters**: Jung, Lakshmi (Vedantic), Freud, and Mary (Neuroscientist)
- **Three-Stage Process**: Relevance assessment, full interpretation, JSON formatting
- **Knowledge Retrieval**: Theme-based fragment retrieval with BGE-M3 embeddings
- **Modular Architecture**: Easy to add new interpreters
- **Real-time Updates**: Supabase subscriptions for interpretation status
- **Queue Support**: Asynchronous interpretation with job tracking
- **Fragment Tracking**: Stores which knowledge fragments were used for future AI memory

## 📋 Prerequisites

- Node.js 18+
- ElevenLabs API key
- Supabase project with service role key
- Railway account (for deployment)

## 🛠️ Installation

1. **Clone and install dependencies:**

```bash
npm install
```

2. **Environment Configuration:**
   Create a `.env` file with the following variables:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Security Configuration
API_SECRET_KEY=generate_a_secure_random_string_here
ALLOWED_ORIGINS=*

# Rate Limiting Configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Optional Configuration
LOG_LEVEL=info
REQUEST_TIMEOUT_MS=30000

# OpenRouter Configuration (for Dream Interpretation)
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Redis Configuration (for Async Queue - optional)
REDIS_HOST=localhost
REDIS_PORT=6379
```

## 🔌 API Endpoints

### Health Check

- `GET /health` - Basic health status
- `GET /health?detailed=true` - Detailed health with service checks
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

### Transcription

- `POST /api/v1/transcription/transcribe` - Main transcription endpoint
- `GET /api/v1/transcription/status` - Transcription service status

### Dream Interpretation

- `POST /api/v1/dreams/interpret-by-id` - Interpret dream using database data
- `POST /api/v1/dreams/interpret` - Interpret with provided transcription
- `POST /api/v1/dreams/interpret-async` - Queue interpretation (returns job ID)
- `GET /api/v1/dreams/interpretation-status/:jobId` - Check job status
- `GET /api/v1/dreams/:dreamId/interpretations` - Get all interpretations
- `GET /api/v1/dreams/interpreters` - List available interpreters

## 🔐 Authentication

The service uses dual authentication:

1. **API Secret**: Validates requests from Supabase Edge Functions

   - Header: `X-API-Secret: your_api_secret`

2. **Supabase JWT**: Validates user identity
   - Header: `X-Supabase-Token: user_jwt_token`

## 🚀 Deployment (Railway)

1. **Connect Repository to Railway**
2. **Set Environment Variables**
3. **Deploy** - Railway auto-builds and deploys
4. **Configure Health Checks** - Use `/health/ready`

## 📊 Integration

Replace the mock setTimeout in your Supabase Edge Function with:

```typescript
const backendResponse = await fetch(
  `${SOMNI_BACKEND_URL}/api/v1/transcription/transcribe`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Secret": SOMNI_BACKEND_API_SECRET,
      "X-Supabase-Token": token,
    },
    body: JSON.stringify({
      dreamId,
      audioBase64,
      duration,
      options: { languageCode: null },
    }),
  }
);
```

## 🧠 Dream Interpretation System

The service includes a sophisticated dream interpretation system with multiple AI interpreters.

### Available Interpreters

1. **Carl Jung** - Archetypal analysis and individuation
2. **Swami Lakshmi** - Vedantic spiritual insights
3. **Sigmund Freud** - Psychoanalytic exploration
4. **Dr. Mary Chen** - Neuroscientific perspective

### Basic Usage

```typescript
// Interpret a dream
const response = await fetch('/api/v1/dreams/interpret-by-id', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Secret': API_SECRET
  },
  body: JSON.stringify({
    dreamId: 'dream-uuid',
    userId: 'user-uuid',
    interpreterType: 'jung' // or 'lakshmi', 'freud', 'mary'
  })
});

// Response includes:
// - interpretation: Full interpretation text
// - dreamTopic: Brief topic/title
// - quickTake: 2-3 sentence summary
// - symbols: Key symbols identified
// - emotionalTone: Primary emotion and intensity
// - selfReflection: Thought-provoking question
```

### Architecture Overview

- **Modular Design**: Easy to add new interpreters
- **Three-Stage Process**: Ensures quality and consistency
- **Knowledge Retrieval**: Theme-based fragment matching
- **Fragment Tracking**: Stores used fragments for future AI memory

For detailed architecture documentation, see [src/dream-interpretation/ARCHITECTURE.md](src/dream-interpretation/ARCHITECTURE.md)
