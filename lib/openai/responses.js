export async function callOpenAIResponses({
  model,
  developerText,
  userText,
  maxOutputTokens = 600,
}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY env var");
  }

  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        { role: "developer", content: developerText },
        { role: "user", content: userText },
      ],
      max_output_tokens: maxOutputTokens,
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`OPENAI_ERROR ${resp.status} ${txt}`);
  }

  const data = await resp.json();

  // The Responses API returns output text in a structured way;
  // but many accounts also receive a convenient "output_text".
  const outputText =
    data.output_text ||
    extractOutputTextFallback(data) ||
    "";

  return outputText;
}

function extractOutputTextFallback(data) {
  try {
    const out = data.output || [];
    let text = "";
    for (const item of out) {
      if (item.type === "message" && Array.isArray(item.content)) {
        for (const c of item.content) {
          if (c.type === "output_text" && typeof c.text === "string") {
            text += c.text;
          }
        }
      }
    }
    return text.trim();
  } catch {
    return "";
  }
}
