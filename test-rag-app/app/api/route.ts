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