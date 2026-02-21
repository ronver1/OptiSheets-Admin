export async function callOpenAI({ model, system, user, max_output_tokens, temperature }) {
  if (!process.env.OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");

  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        { role: "developer", content: system },
        { role: "user", content: user },
      ],
      max_output_tokens,
      temperature,
    }),
  });

  const text = await resp.text();
  if (!resp.ok) throw new Error(`OPENAI_ERROR ${resp.status} ${text}`);

  const data = JSON.parse(text);
  const outText = data.output_text ?? "";

  const usage = data.usage ?? {
    input_tokens: 0,
    output_tokens: 0,
    total_tokens: 0,
  };

  return { outText, usage };
}
