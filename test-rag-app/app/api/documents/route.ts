import { db } from "@/db";
import { documents } from "@/db/schema";
import { createEmbedding } from "@/lib/embed";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { content } = await req.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "content is required and must be a string" },
        { status: 400 }
      );
    }

    const embedding = await createEmbedding(content);

    await db.insert(documents).values({
      content,
      embedding, // customType<number[]>なので配列をそのまま渡す
    });

    return NextResponse.json({ success: true });
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
