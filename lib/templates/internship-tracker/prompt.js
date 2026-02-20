export function buildInternshipTrackerPrompts(applications) {
  const developerText = `
You are OptiSheets AI for an Internship Application Tracker.
You must produce practical, concise, action-oriented recommendations.
Avoid fluff. Assume the user wants specific next steps they can do today.

Output format MUST be JSON with this shape:
{
  "summary": "1-2 sentences overall",
  "priorities": [
    { "title": "string", "why": "string", "actions": ["string", "string"] }
  ],
  "application_insights": [
    {
      "company": "string",
      "role": "string",
      "recommendations": ["string", "string"]
    }
  ]
}
`.trim();

  const userText = `
Here are the user's internship applications (may be empty):
${JSON.stringify(applications, null, 2)}

Give AI recommendations in the required JSON format.
`.trim();

  return { developerText, userText };
}
