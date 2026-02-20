import { getPool } from "../db/pool";

export async function getCachedResponse({ licenseId, requestHash }) {
  const pool = getPool();
  const { rows } = await pool.query(
    `
    SELECT response_json
    FROM ai_cache
    WHERE license_id = $1 AND request_hash = $2
    LIMIT 1
    `,
    [licenseId, requestHash]
  );
  if (!rows.length) return null;
  return rows[0].response_json;
}

export async function setCachedResponse({ licenseId, requestHash, response }) {
  const pool = getPool();
  await pool.query(
    `
    INSERT INTO ai_cache (license_id, request_hash, response_json)
    VALUES ($1, $2, $3)
    ON CONFLICT (license_id, request_hash)
    DO UPDATE SET response_json = EXCLUDED.response_json
    `,
    [licenseId, requestHash, response]
  );
}
