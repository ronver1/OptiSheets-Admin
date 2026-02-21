export async function reserveCreditOrThrow({ client, customer_id, license_id, request_id, template_id }) {
  // Lock wallet row
  const w = await client.query(
    `SELECT id, balance, reserved FROM wallets WHERE customer_id = $1 FOR UPDATE`,
    [customer_id]
  );
  if (!w.rows.length) throw new Error("WALLET_NOT_FOUND");

  const wallet = w.rows[0];
  const balance = Number(wallet.balance);
  const reserved = Number(wallet.reserved);

  // 1 click = 1 AI credit
  const needed = 1;
  const available = balance - reserved;

  if (available < needed) throw new Error("INSUFFICIENT_CREDITS");

  // Reserve
  await client.query(
    `UPDATE wallets SET reserved = reserved + $1 WHERE id = $2`,
    [needed, wallet.id]
  );

  // Ledger entry (reserve)
  await client.query(
    `
    INSERT INTO credit_ledger (customer_id, license_id, delta, kind, template_id, request_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [customer_id, license_id, 0, "reserve", template_id, request_id]
  );

  return { wallet_id: wallet.id, reserved_amount: needed };
}

export async function finalizeDebitOrThrow({ client, customer_id, license_id, request_id, template_id }) {
  const needed = 1;

  // Lock wallet
  const w = await client.query(
    `SELECT id, balance, reserved FROM wallets WHERE customer_id = $1 FOR UPDATE`,
    [customer_id]
  );
  if (!w.rows.length) throw new Error("WALLET_NOT_FOUND");
  const wallet = w.rows[0];

  // Convert reserved → spent
  await client.query(
    `UPDATE wallets SET balance = balance - $1, reserved = reserved - $1 WHERE id = $2`,
    [needed, wallet.id]
  );

  await client.query(
    `
    INSERT INTO credit_ledger (customer_id, license_id, delta, kind, template_id, request_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [customer_id, license_id, -needed, "usage", template_id, request_id]
  );
}

export async function releaseReserveOrThrow({ client, customer_id, license_id, request_id, template_id }) {
  const needed = 1;

  const w = await client.query(
    `SELECT id FROM wallets WHERE customer_id = $1 FOR UPDATE`,
    [customer_id]
  );
  if (!w.rows.length) throw new Error("WALLET_NOT_FOUND");

  await client.query(
    `UPDATE wallets SET reserved = GREATEST(reserved - $1, 0) WHERE id = $2`,
    [needed, w.rows[0].id]
  );

  await client.query(
    `
    INSERT INTO credit_ledger (customer_id, license_id, delta, kind, template_id, request_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [customer_id, license_id, 0, "refund", template_id, request_id]
  );
}
