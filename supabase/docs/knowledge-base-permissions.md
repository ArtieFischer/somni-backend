# Knowledge Base Permissions Documentation

## Overview
The knowledge_base table requires specific permissions for the RAG system to function properly. This document outlines all necessary permissions and their purposes.

## Table Permissions

### 1. Row Level Security (RLS)
```sql
-- RLS should be ENABLED on the knowledge_base table
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
```

### 2. RLS Policies
Two policies exist on the knowledge_base table:

#### Public Read Policy
```sql
CREATE POLICY "knowledge_base_public_read" ON knowledge_base
  FOR SELECT USING (true);
```
- Allows all users (including anon) to read from the table
- Essential for RAG retrieval functionality

#### Service Role Policy
```sql
CREATE POLICY "knowledge_base_service_role_all" ON knowledge_base
  FOR ALL USING (auth.role() = 'service_role');
```
- Allows service role to perform all operations
- Used during data ingestion

### 3. Table-Level Grants (CRITICAL)
These grants are required even with RLS policies:

```sql
-- Grant permissions to service_role for ingestion
GRANT ALL ON TABLE public.knowledge_base TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.knowledge_base_id_seq TO service_role;

-- Grant permissions to authenticated users
GRANT ALL ON TABLE public.knowledge_base TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.knowledge_base_id_seq TO authenticated;

-- Grant SELECT permission to anon for public access
GRANT SELECT ON TABLE public.knowledge_base TO anon;
```

### 4. Function Permissions
The search_knowledge RPC function requires execute permissions:

```sql
-- Grant execute permission on the search function
GRANT EXECUTE ON FUNCTION public.search_knowledge TO anon;
GRANT EXECUTE ON FUNCTION public.search_knowledge TO authenticated;
```

## Common Issues and Solutions

### Issue: "permission denied for table knowledge_base"
**Cause**: Missing table-level GRANT permissions
**Solution**: Run the grants in section 3 above

### Issue: "permission denied for function search_knowledge"
**Cause**: Missing EXECUTE permission on the RPC function
**Solution**: Run the grants in section 4 above

### Issue: Service role can't insert during ingestion
**Cause**: 
1. RLS policy using auth.role() which requires session
2. Missing table-level grants

**Solution**:
1. Ensure service_role has table-level ALL permissions
2. Consider using BYPASSRLS privilege for service_role (requires superuser)

## Verification Queries

Check current permissions:
```sql
-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'knowledge_base';

-- Check table grants
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'knowledge_base'
ORDER BY grantee, privilege_type;

-- Check function grants
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'search_knowledge';
```

## Setup Script
For new deployments or permission fixes, run this complete script:

```sql
-- 1. Ensure RLS is enabled
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

-- 2. Grant table permissions
GRANT ALL ON TABLE public.knowledge_base TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.knowledge_base_id_seq TO service_role;
GRANT ALL ON TABLE public.knowledge_base TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.knowledge_base_id_seq TO authenticated;
GRANT SELECT ON TABLE public.knowledge_base TO anon;

-- 3. Grant function permissions
GRANT EXECUTE ON FUNCTION public.search_knowledge TO anon;
GRANT EXECUTE ON FUNCTION public.search_knowledge TO authenticated;
```

## Notes
- Always run permission grants in Supabase SQL Editor as a superuser
- Permissions are separate from RLS - both are needed
- The anon key is used for public read access (search/retrieval)
- The service_role key is used for administrative tasks (ingestion)