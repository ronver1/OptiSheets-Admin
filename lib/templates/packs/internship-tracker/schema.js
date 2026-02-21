export function validate(input) {
  const fields = {};

  if (!input) fields.input = "Missing input object";
  if (!Array.isArray(input?.applications)) fields.applications = "applications must be an array";

  if (Array.isArray(input?.applications)) {
    // shallow validation only (keep it simple + deterministic)
    input.applications.forEach((a, i) => {
      if (typeof a !== "object" || a === null) fields[`applications[${i}]`] = "must be an object";
    });
  }

  if (Object.keys(fields).length) {
    return {
      ok: false,
      error: {
        code: "BAD_INPUT",
        message: "Invalid internship tracker input",
        fields,
      },
    };
  }

  return { ok: true };
}
