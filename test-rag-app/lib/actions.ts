"use server";

import { openaiClient } from "./openaiClient";

export const conversationWithAI = async (message: string) => {
  const res = await openaiClient.responses.create({
    model: "gpt-5-chat-latest",
    input: message
  });
  return res.output_text
}