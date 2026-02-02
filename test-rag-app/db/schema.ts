import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { customType } from "drizzle-orm/pg-core";

const vector = customType<{ data: number[] }>({
  dataType() {
    return "vector(1536)";
  },

  // ✅ INSERT時に vector形式へ変換
  toDriver(value: number[]) {
    return `[${value.join(",")}]`;
  },

  // ✅ SELECT時に number[] に戻す
  fromDriver(value: unknown): number[] {
    if (typeof value !== "string") {
      throw new Error("Invalid vector value");
    }

    return value
      .slice(1, -1)
      .split(",")
      .map(Number);
  },
});

export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),

  // メインコンテンツ
  content: text("content").notNull(),
  embedding: vector("embedding").notNull(),

  // メタデータ
  title: text("title"),
  source: text("source"), // ファイル名やURLなど
  tags: text("tags"), // カンマ区切りのタグ

  createdAt: timestamp("created_at").defaultNow(),
});

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
