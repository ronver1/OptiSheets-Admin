import { internshipTrackerHandler } from "./internship-tracker/handler";

const templates = {
  "internship-tracker": internshipTrackerHandler,
};

export function getTemplateHandler(templateId) {
  return templates[templateId] || null;
}
