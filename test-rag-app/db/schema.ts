import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

// export const documents = pgTable("documents", {
//   id: uuid("id").defaultRandom().primaryKey(),
//   content: text("content").notNull(),
//   embedding: text("embedding"), // text型で保存し、SQLでvectorにキャスト
//   createdAt: timestamp("created_at").defaultNow(),
// });

import { customType } from "drizzle-orm/pg-core";

const vector = customType<{ data: number[] }>({
  dataType() {
    return "vector(1536)";
  },
});

export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  content: text("content").notNull(),

  embedding: vector("embedding").notNull(),

  createdAt: timestamp("created_at").defaultNow(),
});


export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
