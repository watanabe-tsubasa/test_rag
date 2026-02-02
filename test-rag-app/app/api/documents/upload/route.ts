export const runtime = "nodejs";

import { db } from "@/db";
import { documents } from "@/db/schema";
import { createEmbedding } from "@/lib/embed";
import { splitTextIntoChunks } from "@/lib/chunker";
import { NextResponse } from "next/server";
import * as pdfParse from "pdf-parse";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;
    const tags = formData.get("tags") as string | null;
    const enableChunking = formData.get("enableChunking") !== "false"; // デフォルトtrue

    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (!file.name.endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Only PDF files are supported" },
        { status: 400 }
      );
    }

    // PDFからテキスト抽出
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdf = (pdfParse as any).default || pdfParse;
    const pdfData = await pdf(buffer);
    const content = pdfData.text;

    if (!content.trim()) {
      return NextResponse.json(
        { error: "Could not extract text from PDF" },
        { status: 400 }
      );
    }

    const documentTitle = title || file.name;
    let chunksCreated = 1;

    if (enableChunking) {
      // チャンク分割して登録
      const chunks = splitTextIntoChunks(content);

      const insertPromises = chunks.map(async (chunk) => {
        const embedding = await createEmbedding(chunk.content);
        return db.insert(documents).values({
          content: chunk.content,
          embedding,
          title: `${documentTitle} (${chunk.chunkIndex + 1}/${chunk.totalChunks})`,
          source: file.name,
          tags: tags || null,
        });
      });

      await Promise.all(insertPromises);
      chunksCreated = chunks.length;
    } else {
      // チャンク分割なし
      const embedding = await createEmbedding(content);

      await db.insert(documents).values({
        content,
        embedding,
        title: documentTitle,
        source: file.name,
        tags: tags || null,
      });
    }

    return NextResponse.json({
      success: true,
      filename: file.name,
      textLength: content.length,
      chunksCreated,
    });
  } catch (error) {
    console.error("Error uploading PDF:", error);
    return NextResponse.json(
      { error: "Failed to process PDF" },
      { status: 500 }
    );
  }
}
