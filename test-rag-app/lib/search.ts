import { sql } from "drizzle-orm";
import { db } from "@/db";

interface SearchResult {
  id: string;
  content: string;
  createdAt: Date | null;
}

export async function searchSimilar(
  queryEmbedding: number[],
  limit: number = 3
): Promise<SearchResult[]> {
  const embeddingStr = JSON.stringify(queryEmbedding);

  const results = await db.execute(sql`
    SELECT id, content, created_at as "createdAt"
    FROM documents
    ORDER BY embedding <-> ${embeddingStr}::vector
    LIMIT ${limit};
  `);

  return results as unknown as SearchResult[];
}
