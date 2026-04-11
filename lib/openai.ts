import OpenAI from "openai";

export function createOpenAIClient(apiKey: string) {
  return new OpenAI({ apiKey });
}

export const ASSISTANT_ID = process.env.ASSISTANT_ID ?? "";
