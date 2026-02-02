# RAG システム実装タスクリスト

## 概要
Next.js + Supabase (pgvector) + Drizzle ORM + OpenAI を使用したRAGシステムの実装タスク

## RAG システムフロー
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

## Phase 1: データベースセットアップ（Supabase）

- [ ] Supabase プロジェクトの作成・接続確認
  - [x]SUPABASE_PUBLISHABLE_KEY, SUPABASE_PROJECT_URLを`.env`に記載
- [ ] pgvector 拡張機能の有効化 (`create extension if not exists vector;`)
- [ ] documents テーブルの作成
  - [ ] id (uuid, primary key)
  - [ ] content (text, not null)
  - [ ] embedding (vector(1536))
  - [ ] created_at (timestamp, default now())

### SQL例
```sql
-- pgvector有効化
create extension if not exists vector;

-- テーブル作成
create table documents (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  embedding vector(1536),
  created_at timestamp default now()
);
```

---

## Phase 2: Drizzle ORM セットアップ

- [x] Drizzle ORM のインストール・設定
  ```bash
  pnpm add drizzle-orm postgres
  pnpm add -D drizzle-kit
  ```
- [x] Supabase 接続設定 (環境変数: DATABASE_URL)
- [x] db/schema.ts の作成
  - [x] documents テーブルスキーマ定義
  - [x] embedding カラムの型定義 (customType または text で暫定対応)
- [x] db/index.ts の作成 (drizzle client の初期化)
- [x] drizzle.config.ts の設定

### ファイル例
**db/schema.ts**
```typescript
import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  content: text("content").notNull(),
  embedding: text("embedding"), // 一旦textで扱う（後で改善可能）
  createdAt: timestamp("created_at").defaultNow(),
});
```

---

## Phase 3: OpenAI Embedding 機能の実装

- [x] OpenAI SDK のインストール (既存の場合はスキップ)
- [x] 環境変数に OPENAI_API_KEY を設定
- [x] lib/embed.ts の作成
  - [x] createEmbedding 関数の実装
  - [x] model: "text-embedding-3-small" を使用
  - [x] embedding ベクトル (1536次元) を返す

### ファイル例
**lib/embed.ts**
```typescript
import { openaiClient } from "./openaiClient";

export async function createEmbedding(input: string) {
  const res = await openaiClient.embeddings.create({
    model: "text-embedding-3-small",
    input,
  });

  return res.data[0].embedding;
}
```

---

## Phase 4: ドキュメント登録 API の実装

- [x] app/api/documents/route.ts の作成
- [x] POST メソッドの実装
  - [x] リクエストから content を取得
  - [x] createEmbedding で embedding 生成
  - [x] Drizzle で documents テーブルに挿入
  - [x] embedding を JSON.stringify して保存

### ファイル例
**app/api/documents/route.ts**
```typescript
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

## Phase 5: ベクトル検索機能の実装

- [x] lib/search.ts の作成
- [x] searchSimilar 関数の実装
  - [x] Drizzle の sql テンプレートを使用
  - [x] `<->` 演算子でコサイン距離計算
  - [x] embedding を `::vector` にキャスト
  - [x] LIMIT で上位 N 件を取得

### ファイル例
**lib/search.ts**
```typescript
import { sql } from "drizzle-orm";
import { db } from "@/db";

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

### SQL パターン
```sql
-- ベクトル検索の基本パターン
select *
from documents
order by embedding <-> '[query_embedding]'::vector
limit 3;
```

---

## Phase 6: RAG チャット API の実装

- [x] app/api/chat/route.ts の作成 (または既存ファイルの大幅修正)
- [x] POST メソッドの実装
  - [x] 質問を embedding 化
  - [x] searchSimilar で類似文書を検索
  - [x] 検索結果を context として結合
  - [x] OpenAI Chat Completions API 呼び出し
    - [x] system プロンプトで文脈使用を指示
    - [x] user メッセージに context + 質問を含める
  - [x] GPT の回答を返す

### ファイル例
**app/api/chat/route.ts**
```typescript
import { openaiClient } from "@/lib/openaiClient";
import { createEmbedding } from "@/lib/embed";
import { searchSimilar } from "@/lib/search";

export async function POST(req: Request) {
  const { question } = await req.json();

  // 1. 質問をEmbedding
  const queryEmbedding = await createEmbedding(question);

  // 2. 類似文書検索
  const docs = await searchSimilar(queryEmbedding);

  // 3. 文脈生成
  const context = docs.map((d) => d.content).join("\n");

  // 4. GPT回答
  const response = await openaiClient.responses.create(
    {
      model:"gpt-5.2-chat-latest",
      input: [
        {
          role: "system",
          content: "以下の情報を使って質問に答えてください。",
        },
        {
          role: "user",
          content: `\n\n情報:\n${context}\n\n質問:${question}`
        }
      ],
    }
  )

  return Response.json({
    answer: response.output_text,
  });
}
```

---

## Phase 7: フロントエンド UI の実装

- [x] ドキュメント登録フォームの作成
  - [x] テキストエリアで content 入力
  - [x] /api/documents への POST
  - [x] 登録成功メッセージ表示
- [x] チャット UI の更新
  - [x] /api/chat への POST (既存の場合は修正)
  - [x] 質問と回答の表示
  - [x] ローディング状態の処理

### 実装ファイル
**app/rag/page.tsx** - RAGチャットページ (`/rag` でアクセス)

---

## Phase 8: 動作確認・テスト

> **Note**: GitHub Codespaces上で動作確認済み。ローカル環境でのテストはVercelデプロイ後に実施。

- [ ] ドキュメント登録の動作確認
  - [ ] 複数のドキュメントを登録
  - [ ] Supabase で documents テーブルにデータが保存されているか確認
  - [ ] embedding が正しく保存されているか確認
- [ ] ベクトル検索の動作確認
  - [ ] 質問を送信
  - [ ] 関連文書が正しく取得されるか確認
  - [ ] Supabase SQL Editorで検索クエリを直接実行して確認
- [ ] RAG 回答の品質確認
  - [ ] GPT が文脈を使って回答しているか確認
  - [ ] 無関係な質問への対応確認

### Vercelデプロイ手順
1. GitHubにプッシュ
2. Vercelでプロジェクトをインポート（Root Directory: `test-rag-app`）
3. 環境変数を設定: `OPENAI_API_KEY`, `DATABASE_URL`
4. デプロイ

### 検証用 SQL
```sql
-- documents テーブル確認
SELECT * FROM documents LIMIT 5;

-- vector拡張機能確認
SELECT * FROM pg_extension WHERE extname = 'vector';
```

---

## Phase 9: 強化・改善 (オプション)

- [x] チャンク分割機能の実装
  - [x] 長文を適切なサイズに分割（lib/chunker.ts）
  - [x] 段落・文単位での分割、オーバーラップ対応
  - [x] チャンクごとに embedding 生成
  - [x] app/api/documents/route.ts, app/api/documents/upload/route.ts で使用
- [x] embedding 型を vector として適切に扱う
  - [x] Drizzle の customType で vector 型定義（toDriver/fromDriver実装済み）
  - [x] JSON.stringify を使わない実装
- [x] metadata の追加
  - [x] title カラム追加
  - [x] source カラム追加 (ファイル名など)
  - [x] tags カラム追加
  - [x] UI更新（登録フォーム・参照元表示）
- [x] PDF アップロード対応
  - [x] pdf-parse で PDF テキスト抽出
  - [x] チャンク分割して登録
  - [x] ファイルアップロード UI
- [x] Supabase RPC 化
  - [x] PostgreSQL Function で検索処理を実装 (`supabase/functions/search_documents.sql`)
  - [x] Drizzle から RPC 呼び出し（フォールバック付き）
  - [x] similarity スコアの返却

---

## 環境変数

**.env**
```
OPENAI_API_KEY=your_openai_api_key
DATABASE_URL=postgresql://user:password@host:port/database
```

---

## 技術メモ

### Embedding の次元数
- **text-embedding-3-small**: 1536次元
- Supabase の vector カラムは `vector(1536)` で定義

### Vector 型の扱い
- Drizzle ORM には vector 型のネイティブサポートがない
- 暫定対応: `text` として保存し `JSON.stringify()` を使用
- 改善案: `customType` で vector 型を定義

### ベクトル検索の演算子
- `<->`: コサイン距離 (pgvector)
- 類似度が高いほど距離が小さい
- `ORDER BY embedding <-> query_vector LIMIT N` で上位N件取得

---

## 完成時の機能

✅ 自分の文章を保存できる
✅ Supabase vectorで検索できる
✅ GPTが検索結果を元に答える
✅ Next.js + Drizzleで全部管理できる
