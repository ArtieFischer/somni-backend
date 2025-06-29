// DEPRECATED: This WebSocket approach is no longer used
// We now use REST API initialization with @elevenlabs/react package on frontend
// 
// The new flow is:
// 1. Backend creates signed URL via REST API (/api/v1/conversations/elevenlabs/init)
// 2. Frontend uses @elevenlabs/react package to connect directly to ElevenLabs
// 3. Dynamic variables are passed by frontend during conversation initiation
//
// This file contains the old WebSocket proxy implementation and is kept for reference

/*
// Original WebSocket service implementation - DEPRECATED
// All functionality moved to REST API approach in:
// - src/routes/elevenlabs.ts
// - src/services/elevenlabs-session.service.ts

export class ElevenLabsService {
  // WebSocket proxy implementation - no longer used
}

export function createElevenLabsService(agentId: string) {
  // Factory function - no longer used
}
*/

// For the new implementation, see:
// - REST API: src/routes/elevenlabs.ts
// - Session management: src/services/elevenlabs-session.service.ts
// - Frontend integration: Use @elevenlabs/react package

// Export empty classes to satisfy imports - these should be removed
export class ElevenLabsService {}
export function createElevenLabsService(agentId: string): ElevenLabsService {
  return new ElevenLabsService();
}