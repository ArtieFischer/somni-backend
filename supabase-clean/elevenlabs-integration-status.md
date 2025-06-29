# ElevenLabs Conversational AI Integration Status

## Overview
The ElevenLabs conversational AI integration is now fully operational with proper REST API endpoints for secure session initialization.

## API Endpoints

### Primary Endpoint
**POST** `/api/v1/conversations/elevenlabs/init`

**Request:**
```json
{
  "dreamId": "uuid",
  "interpreterId": "jung|lakshmi|freud|mary"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "conversationId": "uuid",
    "signedUrl": "wss://api.elevenlabs.io/v1/convai/conversation?agent_id=...",
    "dynamicVariables": {
      "user_name": "string",
      "user_profile": "string",
      "dream_content": "string",
      "dream_emotions": ["string"],
      "conversation_context": "string",
      "interpreter_style": "string"
    },
    "isResumed": boolean,
    "messageCount": number
  }
}
```

### Supporting Endpoints

1. **Save Messages**
   - `POST /api/v1/conversations/messages`
   - Store conversation messages from frontend

2. **Refresh Token**
   - `POST /api/v1/conversations/elevenlabs/refresh-token`
   - Refresh session token for long conversations

3. **Validate Session**
   - `GET /api/v1/conversations/elevenlabs/validate-session/:conversationId`
   - Check session validity

## Architecture

### Backend Flow
1. **Authentication** - Validates user JWT token
2. **Conversation Management** - Finds or creates conversation record
3. **Context Building** - Gathers dream interpretation and user data
4. **Session Creation** - Generates secure session token
5. **URL Generation** - Creates signed WebSocket URL for ElevenLabs
6. **Dynamic Variables** - Prepares context data for AI agent

### Data Sources
- **Dreams Table**: `raw_transcript`, `themes`, `recorded_at`
- **Interpretations Table**: `emotional_tone` (JSONB with primary/secondary emotions)
- **User Profiles**: Name, age, location
- **Conversation History**: Previous messages if resuming

### Security
- Row Level Security (RLS) enabled on all tables
- User can only access their own data
- Service role used for system operations
- JWT tokens for authentication

## Frontend Integration

### Using @elevenlabs/react Package

```tsx
import { useConversation } from '@elevenlabs/react';

// 1. Initialize conversation hook
const conversation = useConversation({
  onConnect: () => console.log('Connected'),
  onMessage: (message) => console.log('Message:', message),
  onError: (error) => console.error('Error:', error),
});

// 2. Call backend to get signed URL
const response = await fetch('/api/v1/conversations/elevenlabs/init', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ dreamId, interpreterId })
});

const { data } = await response.json();

// 3. Start conversation with signed URL
await conversation.startSession({
  signedUrl: data.signedUrl
});
```

## Troubleshooting

### Common Issues Resolved

1. **404 Route Not Found**
   - Fixed by registering ElevenLabs router in server-with-websocket.ts

2. **500 Permission Denied**
   - Fixed by updating RLS policy for INSERT operations
   - Added proper WITH CHECK clause

3. **Missing emotions Column**
   - Not needed - emotions extracted from interpretations.emotional_tone
   - Format: `{primary: "anxiety", secondary: "fear", intensity: 0.8}`

### Database Permissions
All required permissions are now properly configured:
- Users can insert/update/delete their own sessions
- Users can select from dreams and interpretations
- Service role has full access for system operations

## Next Steps

1. **Frontend Implementation**
   - Integrate @elevenlabs/react package
   - Handle microphone permissions
   - Implement UI for conversation states

2. **Enhanced Features**
   - Add conversation analytics
   - Implement conversation summaries
   - Add voice customization options

3. **Monitoring**
   - Track conversation metrics
   - Monitor token expiration
   - Log conversation quality metrics