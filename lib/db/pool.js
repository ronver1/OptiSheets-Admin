import { Pool } from "pg";

let pool;

/**
 * Uses DATABASE_URL (recommended on Vercel).
 * Example: postgres://user:pass@host:5432/dbname?sslmode=require
 */
export function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("Missing DATABASE_URL env var");
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes("sslmode=require")
        ? { rejectUnauthorized: false }
        : undefined,
    });
  }
  return pool;
}
