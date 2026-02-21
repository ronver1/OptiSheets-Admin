import { getPool } from "../db";

export async function enforceRateLimit({ license_id, rpm }) {
  const pool = getPool();
  const now = new Date();
  const windowStart = new Date(now.getTime() - 60_000);

  // Count requests in last 60s
  const { rows } = await pool.query(
    `
    SELECT COUNT(*)::int AS cnt
    FROM ai_requests
    WHERE license_id = $1 AND created_at >= $2
    `,
    [license_id, windowStart.toISOString()]
  );

  if ((rows[0]?.cnt ?? 0) >= rpm) {
    return { ok: false };
  }
  return { ok: true };
}
