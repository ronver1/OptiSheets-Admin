import { getPool } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import crypto from "crypto";

function makeLicenseKey() {
  // OS-XXXX-XXXX-XXXX (hex-ish)
  const part = () => crypto.randomBytes(2).toString("hex").toUpperCase(); // 4 chars
  return `OS-${part()}${part()}-${part()}${part()}-${part()}${part()}`;
}

export async function POST(req) {
  const auth = requireAdmin(req);
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const customer_id = body.customer_id || null;

  const pool = getPool();

  // Use a transaction so licenses + wallets stay consistent
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // try a few times in case of rare key collision
    let license_key = null;
    for (let i = 0; i < 5; i++) {
      const candidate = makeLicenseKey();
      const { rowCount } = await client.query(
        "insert into licenses(license_key, customer_id, status) values ($1, $2, 'active') on conflict do nothing",
        [candidate, customer_id]
      );
      if (rowCount === 1) {
        license_key = candidate;
        break;
      }
    }
    if (!license_key) throw new Error("Failed to generate unique license key");

    await client.query(
      "insert into wallets(license_key, balance) values ($1, 0) on conflict do nothing",
      [license_key]
    );

    await client.query("COMMIT");
    return Response.json({ license_key }, { status: 201 });
  } catch (e) {
    await client.query("ROLLBACK");
    return Response.json({ error: String(e.message || e) }, { status: 500 });
  } finally {
    client.release();
  }
}
