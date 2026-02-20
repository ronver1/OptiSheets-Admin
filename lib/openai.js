// lib/openai.js

import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function callModel({ model, messages, maxOutputTokens }) {
  // This uses Responses API style (recommended in newer SDKs).
  // If your installed SDK version differs, we can swap to chat.completions style.
  const response = await client.responses.create({
    model,
    input: messages,
    max_output_tokens: maxOutputTokens,
  });

  // Extract a plain text answer (best-effort)
  const text = response.output_text || "";

  // Token usage fields vary by API/version; best-effort:
  const usage = response.usage || {};
  const totalTokens =
    usage.total_tokens ??
    (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0);

  return {
    raw: response,
    text,
    usage,
    totalTokens,
  };
}