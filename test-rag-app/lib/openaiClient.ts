import OpenAI from "openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
export const openaiClient = new OpenAI({ apiKey: OPENAI_API_KEY });