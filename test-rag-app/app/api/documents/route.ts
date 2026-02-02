import { db } from "@/db";
import { documents } from "@/db/schema";
import { createEmbedding } from "@/lib/embed";
import { splitTextIntoChunks, ChunkOptions } from "@/lib/chunker";
import { NextResponse } from "next/server";

interface CreateDocumentRequest {
  content: string;
  title?: string;
  source?: string;
  tags?: string;
  enableChunking?: boolean;
  chunkOptions?: ChunkOptions;
}

export async function POST(req: Request) {
  try {
    const {
      content,
      title,
      source,
      tags,
      enableChunking = true,
      chunkOptions,
    }: CreateDocumentRequest = await req.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "content is required and must be a string" },
        { status: 400 }
      );
    }

    // チャンク分割が有効な場合
    if (enableChunking) {
      const chunks = splitTextIntoChunks(content, chunkOptions);

      // 各チャンクに対してembeddingを生成して保存
      const insertPromises = chunks.map(async (chunk) => {
        const embedding = await createEmbedding(chunk.content);
        return db.insert(documents).values({
          content: chunk.content,
          embedding,
          title: title
            ? `${title} (${chunk.chunkIndex + 1}/${chunk.totalChunks})`
            : null,
          source: source || null,
          tags: tags || null,
        });
      });

      await Promise.all(insertPromises);

      return NextResponse.json({
        success: true,
        chunksCreated: chunks.length,
      });
    }

    // チャンク分割が無効な場合は従来通り
    const embedding = await createEmbedding(content);

    await db.insert(documents).values({
      content,
      embedding,
      title: title || null,
      source: source || null,
      tags: tags || null,
    });

    return NextResponse.json({ success: true, chunksCreated: 1 });
  } catch (error) {
    console.error("Error creating document:", error);
    return NextResponse.json(
      { error: "Failed to create document" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const allDocuments = await db.select().from(documents);
    return NextResponse.json(allDocuments);
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}
