import OpenAI from "openai";
import { buildUserPrompt, systemPrompt } from "./prompt.js";

export const createOpenRouterClient = () => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return null;
  }

  return new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1"
  });
};

export const generateInsight = async ({ client, snapshot }) => {
  if (!client) {
    throw new Error("OpenRouter client not configured");
  }
  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
  const response = await client.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: buildUserPrompt(snapshot) }
    ]
  });

  const content = response.choices?.[0]?.message?.content || "{}";
  try {
    return JSON.parse(content);
  } catch (error) {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw error;
  }
};
