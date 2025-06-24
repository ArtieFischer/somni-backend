# Transcription Filtering Logic

## Overview
The backend applies multiple checks to determine if a transcription should have metadata (title and image) generated.

## Filtering Criteria

### 1. Duration Check (Primary)
- **Minimum**: 5 seconds
- **Rationale**: Matches frontend filtering, ensures meaningful content
- **Applied when**: Duration is provided by the frontend

### 2. Character Count Check
- **Minimum**: 30 characters
- **Rationale**: Ensures there's enough text for meaningful analysis
- **Applied**: Always

### 3. Token Count Check
- **Minimum**: 10 tokens (estimated)
- **Calculation**: `Math.ceil(text.length / 4)` (rough approximation)
- **Rationale**: LLMs work with tokens, not characters
- **Applied**: Always

### 4. Language Check
- **Supported**: English only (`en*` or `eng`)
- **Rationale**: Metadata prompts are in English
- **Applied**: Always

## Skip Reasons Logged
When metadata generation is skipped, the system logs detailed reasons:
- Recording duration (if provided)
- Transcript length in characters
- Estimated token count
- Detected language

## Examples

### Will Generate Metadata:
- Duration: 10s, Text: "I was flying over a beautiful ocean..." (40 chars, ~10 tokens), Language: en

### Will Skip:
- Duration: 3s (too short)
- Text: "Hello world" (11 chars, ~3 tokens - too few tokens)
- Language: es (Spanish not supported)

## Database Storage
The `transcription_usage` table stores:
- `duration_seconds`: Recording duration (0 if not provided)
- `language_code`: Detected language from transcription
- `character_count`: Length of transcribed text