import { getPool } from "../db";

export async function validateLicense({ license_key, templateId }) {
  const pool = getPool();
  const { rows } = await pool.query(
    `
    SELECT id, license_key, template_id, status, expires_at, customer_id
    FROM licenses
    WHERE license_key = $1
    LIMIT 1
    `,
    [license_key]
  );

  if (!rows.length) return { ok: false, reason: "LICENSE_INVALID" };

  const lic = rows[0];
  if (lic.status !== "active") return { ok: false, reason: "LICENSE_INVALID" };
  if (lic.expires_at && new Date(lic.expires_at).getTime() < Date.now())
    return { ok: false, reason: "LICENSE_INVALID" };

  if (lic.template_id !== templateId)
    return { ok: false, reason: "LICENSE_NOT_ENTITLED" };

  return { ok: true, license: lic };
}
