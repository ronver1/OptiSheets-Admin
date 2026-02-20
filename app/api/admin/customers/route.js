import { getPool } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";



export async function GET(req) {
  const auth = requireAdmin(req);
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });

  const pool = getPool();
  const { rows } = await pool.query("select * from customers order by created_at desc limit 200");
  return Response.json(rows);
}

export async function POST(req) {
  const auth = requireAdmin(req);
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const { full_name, email } = body;

  if (!full_name) return Response.json({ error: "full_name required" }, { status: 400 });

  const pool = getPool();
  const { rows } = await pool.query(
    "insert into customers(full_name, email) values ($1, $2) returning *",
    [full_name, email || null]
  );
  return Response.json(rows[0], { status: 201 });
}
