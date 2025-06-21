# Model Comparison Summary

## Test Date: Sat Jun 21 2025

## Models Tested
1. **Mistral 7B** (mistralai/mistral-7b-instruct:free)
2. **Mistral Nemo 12B** (mistralai/mistral-nemo:free)  
3. **Dolphin3.0 Mistral 24B** (cognitivecomputations/dolphin3.0-mistral-24b:free)
4. **Llama 4 Scout** (meta-llama/llama-4-scout:free)
5. **Gemma 2 9B** (google/gemma-2-9b-it:free)

## Key Findings

### Working Models

#### Mistral 7B
- ✅ Handles all content types including controversial
- ⚠️ Sometimes returns fewer symbols (3-4 instead of 5-10)
- Good scene descriptions but shorter
- Fast response times
- Temperature: 0.9

#### Mistral Nemo 12B
- ✅ Excellent performance across all dream types
- ✅ Consistently returns 5-10 symbols as requested
- ✅ Very detailed and vivid scene descriptions
- ✅ Creative and evocative titles
- No content moderation issues
- **Recommended as primary model**

#### Dolphin3.0 Mistral 24B
- ✅ Good performance on all content
- ✅ Returns appropriate symbol counts
- ✅ Creative titles and descriptions
- Slightly more abstract in descriptions
- No content moderation issues

### Failed Models

#### Llama 4 Scout
- ❌ Blocked by Meta moderation for sexual/violent content
- Provider errors (503) on non-controversial content
- Not suitable for dream analysis with sensitive content

#### Gemma 2 9B
- ❌ Consistent Internal Server Errors (500)
- Did not successfully process any dreams

## Recommendations

1. **Primary Model**: Use Mistral Nemo 12B for best results
2. **Fallback Chain**: 
   - First: Mistral Nemo 12B
   - Second: Dolphin3.0 Mistral 24B
   - Third: Mistral 7B

3. **Avoid**: Llama 4 Scout for any content that might be flagged

## Example Quality Comparison

### Sexual Dream Example
**Mistral 7B**: "Passionate Dance in the Bedroom" (3 symbols)
**Mistral Nemo**: "College Passion" (6 symbols, much longer scene)
**Dolphin3.0**: "Intimate Dream" (6 symbols, atmospheric description)

### Violence Dream Example
**Mistral 7B**: "Bloody Hellscape Pursuit" (5 symbols)
**Mistral Nemo**: "Bloody Warzone Chase" (8 symbols, very detailed)
**Dolphin3.0**: "War zone nightmare" (6 symbols)

## Implementation Notes

- All Mistral models required prompt training to be enabled
- Temperature of 0.9 works well for creative titles/scenes
- JSON response format enforced successfully
- Appendix shuffling working correctly
- 5-10 symbol requirement mostly met (except Mistral 7B sometimes)