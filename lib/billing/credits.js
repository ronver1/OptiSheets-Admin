import { getPool } from "../db/pool";

export async function chargeCreditsOrThrow({
  customerId,
  licenseId,
  cost,
  reason,
  requestHash,
  client, // pg client inside a transaction
}) {
  // 1) Lock wallet row
  const walletRes = await client.query(
    `SELECT id, balance FROM wallets WHERE customer_id = $1 FOR UPDATE`,
    [customerId]
  );

  if (!walletRes.rows.length) {
    throw new Error("WALLET_NOT_FOUND");
  }

  const wallet = walletRes.rows[0];
  const balance = Number(wallet.balance);

  if (balance < cost) {
    throw new Error("INSUFFICIENT_CREDITS");
  }

  // 2) Decrement balance
  await client.query(
    `UPDATE wallets SET balance = balance - $1 WHERE id = $2`,
    [cost, wallet.id]
  );

  // 3) Ledger entry (negative delta)
  await client.query(
    `
    INSERT INTO credit_ledger (customer_id, license_id, delta, reason, request_hash)
    VALUES ($1, $2, $3, $4, $5)
    `,
    [customerId, licenseId, -cost, reason, requestHash]
  );

  return { wallet_id: wallet.id };
}
