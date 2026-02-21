export function transform(input) {
  const apps = (input.applications || []).map((a) => ({
    company: str(a.company),
    role: str(a.role),
    status: str(a.status),
    location: str(a.location),
    link: str(a.link),
    notes: str(a.notes),
    last_action: str(a.last_action),
    next_action: str(a.next_action),
  }));

  // deterministic + trimmed
  return { applications: apps };
}

function str(x) {
  return (x ?? "").toString().trim();
}
