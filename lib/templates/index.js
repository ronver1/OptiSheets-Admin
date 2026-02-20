// lib/templates/index.js
import { runInternshipTrackerTemplate } from "./internship-tracker/handler";

// Add future templates here:
// import { runSyllabusTemplate } from "./syllabus/handler";
// import { runGpaTemplate } from "./gpa/handler";

export function getTemplateHandler(templateId) {
  switch (templateId) {
    case "internship_tracker":
    case "internship-tracker":
      return runInternshipTrackerTemplate;

    default:
      return null;
  }
}
