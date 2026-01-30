import { openaiClient } from "@/lib/openaiClient";

export async function createEmbedding(input: string) {
  const res = await openaiClient.embeddings.create({
    model: "text-embedding-3-small",
    input,
  });

  return res.data[0].embedding;
}