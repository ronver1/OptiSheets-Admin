export function buildPrompt(canonicalInput) {
  const system = `
You are OptiSheets AI for an Internship Application Tracker.

Hard rules:
- Return VALID JSON ONLY. No markdown. No extra keys.
- Be concise and action-oriented.
- Do not mention internal policies.

Output JSON schema:
{
  "summary": "string",
  "priorities": [
    { "title": "string", "why": "string", "actions": ["string"] }
  ],
  "application_insights": [
    { "company": "string", "role": "string", "recommendations": ["string"] }
  ]
}
`.trim();

  const user = `
Applications:
${JSON.stringify(canonicalInput.applications, null, 2)}

Generate output strictly in the required JSON schema.
`.trim();

  return { system, user };
}
