// lib/templates/internship-tracker/handler.js

export async function runInternshipTrackerTemplate(input) {
  // input is the parsed JSON body from Google Sheets
  // For now, we’ll just return a “fake AI” response so you can test end-to-end.

  const applications = Array.isArray(input.applications) ? input.applications : [];

  // Basic “analysis” without AI (helps you test wiring)
  const total = applications.length;

  return {
    summary: `Received ${total} applications. Backend wiring looks good.`,
    top_priorities: total === 0
      ? "Add at least 1 application in the Applications tab."
      : "1) Follow up on your oldest applications\n2) Prepare for interviews this week\n3) Network with recruiters",
    followup_messages:
      "Hi [Recruiter Name],\n\nI recently applied for [Role] at [Company] and wanted to reaffirm my interest. Would you be open to a quick chat this week?\n\nThanks,\n[Your Name]",
    resume_suggestions:
      "Make sure your resume bullet points include metrics (numbers) and impact. Tailor keywords to each job description.",
    warnings:
      total === 0 ? "No applications were provided." : ""
  };
}
