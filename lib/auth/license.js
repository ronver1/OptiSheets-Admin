import { getPool } from "../db/pool";

export async function validateLicenseOrThrow({ licenseKey, templateId }) {
  const pool = getPool();

  const { rows } = await pool.query(
    `
    SELECT
      l.id AS license_id,
      l.license_key,
      l.customer_id,
      l.template_id,
      l.status,
      l.expires_at,
      c.email AS customer_email
    FROM licenses l
    LEFT JOIN customers c ON c.id = l.customer_id
    WHERE l.license_key = $1
    LIMIT 1
    `,
    [licenseKey]
  );

  if (!rows.length) {
    throw new Error("LICENSE_INVALID");
  }

  const lic = rows[0];

  if (lic.status !== "active") {
    throw new Error("LICENSE_INVALID");
  }

  if (lic.expires_at && new Date(lic.expires_at).getTime() < Date.now()) {
    throw new Error("LICENSE_INVALID");
  }

  if (lic.template_id !== templateId) {
    throw new Error("LICENSE_NOT_ENTITLED");
  }

  return lic;
}
