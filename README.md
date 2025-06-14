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

- **Secure API Gateway**: Dual authentication (API secret + Supabase JWT)
- **ElevenLabs Integration**: Speech-to-text transcription using `scribe_v1` model
- **Database Management**: Direct Supabase integration for dream record updates
- **Comprehensive Logging**: Structured JSON logging with Winston
- **Rate Limiting**: Configurable rate limits with user-based keys
- **Health Monitoring**: Multiple health check endpoints for monitoring
- **Error Handling**: Detailed error mapping and user-friendly messages
- **Audio Validation**: File size and format validation before processing
- **Usage Tracking**: Transcription usage recording for billing/analytics

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
