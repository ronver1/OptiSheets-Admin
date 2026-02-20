export const TEMPLATE_REGISTRY = {
  "syllabus-breakdown": {
    model: "gpt-4.1-mini",
    maxOutputTokens: 800,
    maxReserveCap: 5000,
    rpm: 10,
  },
  "internship-tracker": {
    model: "gpt-4.1-mini",
    maxOutputTokens: 600,
    maxReserveCap: 4000,
    rpm: 10,
  },
};

export function getTemplateConfig(templateId) {
  return TEMPLATE_REGISTRY[templateId] || null;
}