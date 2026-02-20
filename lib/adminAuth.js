export function requireAdmin(req) {
  const expected = process.env.ADMIN_API_KEY;
  const provided = req.headers.get("x-admin-key");

  if (!expected) {
    return { ok: false, status: 500, message: "ADMIN_API_KEY is not set" };
  }

  if (!provided || provided !== expected) {
    return { ok: false, status: 401, message: "Unauthorized (bad admin key)" };
  }

  return { ok: true, status: 200, message: "OK" };
}
