export const registry = {
  "internship-tracker": {
    templateId: "internship-tracker",
    model: "gpt-4o-mini",
    maxOutputTokens: 700,
    maxReserveCap: 1, // credits per run (hard cap)
    rpm: 10,          // requests per minute per license
  },
};

export function getTemplateConfig(templateId) {
  return registry[templateId] || null;
}
