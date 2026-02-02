import { sql } from "drizzle-orm";
import { db } from "@/db";

export interface SearchResult {
  id: string;
  content: string;
  title: string | null;
  source: string | null;
  tags: string | null;
  createdAt: Date | null;
  similarity?: number;
}

/**
 * ベクトル検索を実行
 * Supabase RPC (search_documents) が利用可能な場合はRPCを使用
 * 利用できない場合は直接クエリを実行
 */
export async function searchSimilar(
  queryEmbedding: number[],
  limit: number = 3
): Promise<SearchResult[]> {
  const embeddingStr = `[${queryEmbedding.join(",")}]`;

  try {
    // RPC経由で検索（Supabase Functionが登録されている場合）
    const results = await db.execute(sql`
      SELECT * FROM search_documents(${embeddingStr}::vector(1536), ${limit});
    `);

    return (results as unknown as SearchResult[]).map((r) => ({
      ...r,
      createdAt: r.createdAt,
    }));
  } catch {
    // RPC未登録の場合は直接クエリ
    const results = await db.execute(sql`
      SELECT id, content, title, source, tags, created_at as "createdAt"
      FROM documents
      ORDER BY embedding <-> ${embeddingStr}::vector
      LIMIT ${limit};
    `);

    return results as unknown as SearchResult[];
  }
}
