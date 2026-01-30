import { openaiClient } from "@/lib/openaiClient";
import { createEmbedding } from "@/lib/embed";
import { searchSimilar } from "@/lib/search";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { question } = await req.json();

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "question is required and must be a string" },
        { status: 400 }
      );
    }

    // 1. 質問をEmbedding化
    const queryEmbedding = await createEmbedding(question);

    // 2. 類似文書を検索
    const docs = await searchSimilar(queryEmbedding);

    // 3. 文脈を生成
    const context = docs.map((d) => d.content).join("\n\n");

    // 4. GPTで回答を生成
    const response = await openaiClient.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "あなたは親切なアシスタントです。以下の情報を使って質問に答えてください。情報に含まれていない内容については、その旨を伝えてください。",
        },
        {
          role: "user",
          content: `情報:\n${context}\n\n質問: ${question}`,
        },
      ],
    });

    return NextResponse.json({
      answer: response.output_text,
      sources: docs.map((d) => ({
        id: d.id,
        content: d.content.substring(0, 100) + "...",
      })),
    });
  } catch (error) {
    console.error("Error in chat:", error);
    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    );
  }
}
