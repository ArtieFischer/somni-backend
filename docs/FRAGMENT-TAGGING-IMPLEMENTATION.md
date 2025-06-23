# Fragment-Theme Tagging Implementation

## Overview
This document describes the implementation of the fragment-theme tagging system, which connects Jung book fragments with psychological themes using BGE-M3 embeddings.

## Problem Discovered
Initial attempts to tag fragments with themes resulted in 0 relationships being created. Investigation revealed:

1. **Embedding Storage Issue**: While embeddings were stored correctly as `vector(1024)` type in PostgreSQL, the Supabase JavaScript client was returning them as JSON strings
2. **Solution**: Database-side similarity calculations work correctly, but JavaScript-side calculations required parsing the JSON strings

## Key Issues Resolved

### 1. Similarity Threshold Problem
- Initial threshold of 0.28 was creating 36,000+ relationships per 50 fragments (way too many)
- Even threshold of 0.45 created 373 themes per fragment (out of 726 total themes)
- **Root Cause**: Theme embeddings were too conceptually similar

### 2. Theme Embedding Quality
- Themes were embedded using both label and description: `"Beach. Dreams about beaches, boundaries between conscious and unconscious mind"`
- This caused "beach" to rank high for Jung texts about the unconscious
- **Solution**: Regenerated embeddings using only labels with context: `"Dream symbol: Beach"`

### 3. Supabase Row Limit
- Default Supabase limit is 1000 rows per query
- Initial scripts only processed 1000 out of 3092 fragments
- **Solution**: Implemented pagination using `.range()` method

## Final Implementation

### Scripts Created

1. **`diagnose-embedding-issue.ts`**
   - Diagnosed the JSON string storage issue
   - Confirmed database-side calculations work correctly

2. **`tag-fragments-database.ts`**
   - Attempted to use database function for bulk tagging
   - Failed due to timeout (2.2M comparisons)

3. **`tag-fragments-stream.ts`**
   - Processed fragments one by one
   - Still created too many relationships with low threshold

4. **`tag-fragments-top-n.ts`**
   - Takes only top N themes per fragment
   - Ensures consistent number of relationships
   - Hit 1000 row limit issue

5. **`tag-all-fragments.ts`**
   - Final solution with pagination
   - Processes all fragments in batches of 1000
   - Creates exactly N themes per fragment

6. **`regenerate-theme-embeddings-simple.ts`**
   - Regenerates theme embeddings using labels only
   - Creates more distinct, literal embeddings

### Database Functions

```sql
-- Get top N themes for a fragment
CREATE OR REPLACE FUNCTION get_top_n_themes_for_fragment(
  p_fragment_id UUID,
  p_top_n INTEGER DEFAULT 15
)
RETURNS TABLE (
  theme_code TEXT,
  similarity FLOAT
)

-- Get most frequently used themes across all fragments
CREATE OR REPLACE FUNCTION get_most_used_themes()
RETURNS TABLE (
  theme_code TEXT,
  theme_label TEXT,
  fragment_count BIGINT,
  avg_similarity FLOAT
)
```

## Results

### Before (with description-based embeddings)
- Top themes for Jung archetype text: creature (57.2%), beach (57.1%), darkness (56.9%)
- Similarities very close together (49-57%)
- Conceptually related themes ranked too high

### After (with label-only embeddings)
- Top themes more relevant: unfamiliar_place (42.0%), anxiety (41.7%), mystery (41.0%)
- Better similarity spread (39-42%)
- More literal, intuitive matches

### Final Statistics
- 3092 fragments tagged with 10 themes each
- 30,920 total fragment-theme relationships
- Top matched themes: recurring (415), religious (264), mystery (236)
- Average similarity: 46-48%

## Testing

Created comprehensive test suite (`test-complete-rag-system.ts`) that:
- Tests 5 natural dreams (not Jung-biased)
- For each dream, retrieves:
  - Top 10 matching themes
  - Top 5 direct fragment matches
  - Top 3 fragments for each theme
- Outputs results to JSON for analysis

## Key Learnings

1. **Embedding Context Matters**: Including descriptions made embeddings too conceptually similar
2. **Database vs Client**: Always verify how data is returned from Supabase
3. **Pagination Required**: Default limits can silently truncate results
4. **Top-N Approach**: Better than threshold-based for consistent results
5. **Test with Real Data**: Natural dreams revealed issues that Jung-specific tests wouldn't