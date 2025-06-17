-- Knowledge base table (supports multiple interpreters)
create table if not exists knowledge_base (
  id bigint primary key generated always as identity,
  interpreter_type text not null default 'jung',
  source text not null, -- book name
  chapter text, -- chapter/section name
  content text not null, -- actual text chunk
  content_type text not null, -- 'theory', 'symbol', 'case_study', 'dream_example'
  metadata jsonb default '{}', -- flexible metadata
  embedding vector(384), -- using gte-small (384 dimensions)
  created_at timestamp with time zone default now(),

  -- Ensure valid interpreter types
  constraint valid_interpreter check (
    interpreter_type in ('jung', 'freud', 'neuroscientist', 'universal')
  )
);

-- Create indexes for performance
create index if not exists idx_kb_interpreter on knowledge_base(interpreter_type);
create index if not exists idx_kb_content_type on knowledge_base(content_type);
create index if not exists idx_kb_embedding on knowledge_base using hnsw (embedding vector_ip_ops);

-- Function to search knowledge with similarity
create or replace function search_knowledge(
  query_embedding vector(384),
  target_interpreter text default 'jung',
  similarity_threshold float default 0.7,
  max_results int default 5
)
returns table (
  id bigint,
  content text,
  source text,
  chapter text,
  content_type text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    kb.id,
    kb.content,
    kb.source,
    kb.chapter,
    kb.content_type,
    1 - (kb.embedding <=> query_embedding) as similarity
  from knowledge_base kb
  where
    kb.interpreter_type = target_interpreter
    and 1 - (kb.embedding <=> query_embedding) > similarity_threshold
  order by kb.embedding <=> query_embedding
  limit max_results;
end;
$$;