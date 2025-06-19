# Easy Model Switching for Comparison Testing

This guide shows you how to easily switch between different AI models to compare responses.

## Quick Model Switch (Code)

**Method 1: Direct code change**
In `src/services/modelConfig.ts`, line 42:

```typescript
private currentDefaultModel: string = QUICK_MODELS.LLAMA_4; // <-- Change this line
```

Change to any of these:

- `QUICK_MODELS.LLAMA_4` - Llama 4 Scout (Free) - **Current Default**
- `QUICK_MODELS.GPT_4O_MINI` - GPT-4o Mini ($0.15/1K tokens)
- `QUICK_MODELS.CLAUDE_HAIKU` - Claude 3 Haiku ($0.25/1K tokens)
- `QUICK_MODELS.LLAMA_3_1` - Llama 3.1 8B (Free)
- `QUICK_MODELS.GEMMA_2` - Gemma 2 9B (Free)

## API Endpoints for Runtime Switching

**Switch Model:**

```bash
curl -X POST http://localhost:3001/api/v1/interpretation/switch-model \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt4o-mini"}'
```

**Check Current Model:**

```bash
curl http://localhost:3001/api/v1/interpretation/current-model
```

### Supported shortcuts:

- `"llama4"` - Switch to Llama 4 Scout (Free)
- `"gpt4o-mini"` - Switch to GPT-4o Mini
- `"claude"` - Switch to Claude 3 Haiku
- `"llama3"` - Switch to Llama 3.1 8B

### Using full model IDs:

```bash
curl -X POST http://localhost:3001/api/v1/interpretation/switch-model \
  -H "Content-Type: application/json" \
  -d '{"model": "openai/gpt-4o-mini"}'
```

## Available Models from OpenRouter

According to OpenRouter docs:

### Free Models:

- `meta-llama/llama-4-scout:free` - **Default**
- `meta-llama/llama-3.1-8b-instruct:free`
- `google/gemma-2-9b-it:free`

### Paid Models:

- `openai/gpt-4o-mini` - $0.15/1K tokens - **Recommended for comparison**
- `anthropic/claude-3-haiku` - $0.25/1K tokens
- `openai/gpt-4o` - Higher cost, best quality

## Example Workflow

1. **Start with default (Llama 4):**

   ```bash
   # Test your dream interpretation
   curl -X POST http://localhost:3001/api/v1/interpretation/test/interpret \
     -H "Content-Type: application/json" \
     -H "X-API-Secret: your-secret" \
     -d '{...your test data...}'
   ```

2. **Switch to GPT-4o Mini:**

   ```bash
   curl -X POST http://localhost:3001/api/v1/interpretation/switch-model \
     -H "Content-Type: application/json" \
     -d '{"model": "gpt4o-mini"}'
   ```

3. **Test same dream:**

   ```bash
   # Run the same test again to compare responses
   curl -X POST http://localhost:3001/api/v1/interpretation/test/interpret \
     -H "Content-Type: application/json" \
     -H "X-API-Secret: your-secret" \
     -d '{...same test data...}'
   ```

4. **Switch back to Llama 4:**
   ```bash
   curl -X POST http://localhost:3001/api/v1/interpretation/switch-model \
     -H "Content-Type: application/json" \
     -d '{"model": "llama4"}'
   ```

## Notes

- Model switches persist until server restart
- Cost tracking is automatically handled for paid models
- Llama 4 Scout is currently the default and preferred for Jung interpretations
- All models support the same JSON response format
- Model switching is only available in the test environment for safety
