-- Supabase SQL Editorで実行してください
-- ベクトル検索用のPostgreSQL Function

CREATE OR REPLACE FUNCTION search_documents(
  query_embedding vector(1536),
  match_count int DEFAULT 3
)
RETURNS TABLE (
  id uuid,
  content text,
  title text,
  source text,
  tags text,
  created_at timestamp,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.content,
    d.title,
    d.source,
    d.tags,
    d.created_at,
    1 - (d.embedding <-> query_embedding) AS similarity
  FROM documents d
  ORDER BY d.embedding <-> query_embedding
  LIMIT match_count;
END;
$$;

-- 使用例:
-- SELECT * FROM search_documents('[0.1, 0.2, ...]'::vector(1536), 5);
