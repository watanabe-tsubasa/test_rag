✅ Next.js
✅ Supabase（Vector対応）
✅ Drizzle ORM

---

# ✅ この構成で作るRAGの全体像

まず完成形はこうなります：

```
PDFや文章をアップロード
↓
Embedding生成（OpenAI）
↓
Supabaseのvectorカラムに保存（Drizzle経由）
↓
質問が来る
↓
ベクトル検索で関連文書取得
↓
GPTに文脈として渡して回答生成
```

---

# ✅ 今回の技術スタックに最適な構造

## Supabase側

* PostgreSQL + pgvector
* Drizzle ORMで操作
* similarity検索はSQLで実行

---

# ✅ 必要なテーブル設計

まずRAGで最低限必要なのはこれ：

## ✅ documents テーブル

| column     | 型            | 内容     |
| ---------- | ------------ | ------ |
| id         | uuid         | 主キー    |
| content    | text         | チャンク本文 |
| embedding  | vector(1536) | ベクトル   |
| created_at | timestamp    | 登録日    |

---

# ✅ Supabaseでvectorを有効化する

まずSQL Editorで実行：

```sql
create extension if not exists vector;
```

---

# ✅ テーブル作成SQL

```sql
create table documents (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  embedding vector(1536),
  created_at timestamp default now()
);
```

---

# ✅ Drizzle ORMで定義

`db/schema.ts`

```ts
import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),

  content: text("content").notNull(),

  // drizzleにはvector型がないので customTypeで定義する
  embedding: text("embedding"), // 一旦textで扱う（後で改善可能）

  createdAt: timestamp("created_at").defaultNow(),
});
```

---

# ✅ Embedding生成（OpenAI）

`lib/embed.ts`

```ts
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function createEmbedding(input: string) {
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input,
  });

  return res.data[0].embedding;
}
```

---

# ✅ ドキュメント登録API

`app/api/documents/route.ts`

```ts
import { db } from "@/db";
import { documents } from "@/db/schema";
import { createEmbedding } from "@/lib/embed";

export async function POST(req: Request) {
  const { content } = await req.json();

  const embedding = await createEmbedding(content);

  await db.insert(documents).values({
    content,
    embedding: JSON.stringify(embedding),
  });

  return Response.json({ success: true });
}
```

---

# ✅ similarity検索（Supabase SQL）

ここがRAGの心臓です。

Supabaseでベクトル検索するSQL：

```sql
select *
from documents
order by embedding <-> '[...]'
limit 3;
```

---

# ✅ Drizzleでベクトル検索する方法

Drizzleは `<->` 演算子を直接書けるのでこうします：

```ts
import { sql } from "drizzle-orm";

export async function searchSimilar(queryEmbedding: number[]) {
  const embeddingStr = JSON.stringify(queryEmbedding);

  const results = await db.execute(sql`
    select *
    from documents
    order by embedding <-> ${embeddingStr}::vector
    limit 3;
  `);

  return results;
}
```

---

# ✅ 質問API（RAG本体）

`app/api/chat/route.ts`

```ts
import OpenAI from "openai";
import { createEmbedding } from "@/lib/embed";
import { searchSimilar } from "@/lib/search";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  const { question } = await req.json();

  // 1. 質問をEmbedding
  const queryEmbedding = await createEmbedding(question);

  // 2. 類似文書検索
  const docs = await searchSimilar(queryEmbedding);

  // 3. 文脈生成
  const context = docs.map((d) => d.content).join("\n");

  // 4. GPT回答
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "以下の情報を使って質問に答えてください。",
      },
      {
        role: "user",
        content: `情報:\n${context}\n\n質問:${question}`,
      },
    ],
  });

  return Response.json({
    answer: completion.choices[0].message.content,
  });
}
```

---

# ✅ ここまでで完成するもの

✅ 自分の文章を保存できる
✅ Supabase vectorで検索できる
✅ GPTが検索結果を元に答える
✅ Next.js + Drizzleで全部管理できる

---

# ✅ 次に絶対やるべき強化ポイント

| 強化                        | 理由          |
| ------------------------- | ----------- |
| チャンク分割                    | 文章が長いと精度落ちる |
| embedding型をvectorとして扱う    | text保存は仮    |
| metadata追加（title, source） | 実用必須        |
| PDFアップロード対応               | RAGらしさが出る   |
| Supabase RPC化             | 検索が綺麗になる    |