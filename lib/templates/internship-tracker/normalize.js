export function normalizeApplications(applicationsRaw) {
  if (!Array.isArray(applicationsRaw)) return [];

  return applicationsRaw
    .map((row) => {
      if (!row || typeof row !== "object") return null;

      return {
        company: safeStr(row.company),
        role: safeStr(row.role),
        status: safeStr(row.status),
        location: safeStr(row.location),
        notes: safeStr(row.notes),
        last_action: safeStr(row.last_action),
        next_action: safeStr(row.next_action),
        link: safeStr(row.link),
      };
    })
    .filter(Boolean);
}

function safeStr(x) {
  if (x === null || x === undefined) return "";
  return String(x).trim();
}
