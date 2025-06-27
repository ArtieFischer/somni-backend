// TEMPORARY FIX: Handle both interpreter_id and interpreter_type column names
// until database schema is standardized

// In createConversation method:
.insert({
  user_id: config.userId,
  dream_id: config.dreamId,
  interpreter_type: config.interpreterId,  // Use interpreter_type instead of interpreter_id
  status: 'active',
  started_at: new Date().toISOString()
})

// In mapping functions:
interpreterId: data.interpreter_id || data.interpreter_type,  // Handle both column names