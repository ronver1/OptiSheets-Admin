import { getPool } from "@/lib/db";

/**
 * validateLicenseWallet(licenseKey)
 * - Confirms license exists and is active
 * - Confirms wallet exists
 * - Returns { status, balance, reserved, available }
 */
import { getPool } from "@/lib/db";

/**
 * Validates a license key and returns wallet info.
 * Fake keys will ALWAYS return valid: false.
 */
export async function validateLicenseWallet(licenseKey) {
  const pool = getPool();

  // 1) Check if license exists
  const licRes = await pool.query(
    `SELECT license_key, status
     FROM licenses
     WHERE license_key = $1
     LIMIT 1`,
    [licenseKey]
  );

  if (licRes.rowCount === 0) {
    return {
      valid: false,
      status: "not_found",
      balance: 0,
      reserved: 0,
      available: 0,
    };
  }

  const license = licRes.rows[0];

  // 2) License must be ACTIVE
  if (license.status !== "active") {
    return {
      valid: false,
      status: license.status,
      balance: 0,
      reserved: 0,
      available: 0,
    };
  }

  // 3) Get wallet
  const walletRes = await pool.query(
    `SELECT balance, reserved
     FROM wallets
     WHERE license_key = $1
     LIMIT 1`,
    [licenseKey]
  );

  if (walletRes.rowCount === 0) {
    return {
      valid: false,
      status: "wallet_missing",
      balance: 0,
      reserved: 0,
      available: 0,
    };
  }

  const balance = Number(walletRes.rows[0].balance);
  const reserved = Number(walletRes.rows[0].reserved);

  return {
    valid: true,
    status: license.status,
    balance,
    reserved,
    available: balance - reserved,
  };
}

/**
 * estimateReserve(payload, maxOutputTokens)
 * Conservative estimate:
 * - input tokens ~ 1 token per 4 characters
 * - reserve = estimatedInputTokens + maxOutputTokens
 */
export function estimateReserve(payload, maxOutputTokens) {
  const maxOut = Number(maxOutputTokens);
  if (!Number.isFinite(maxOut) || maxOut < 0) {
    throw new Error("Invalid maxOutputTokens");
  }

  const s = typeof payload === "string" ? payload : JSON.stringify(payload ?? {});
  const estimatedInputTokens = Math.ceil(s.length / 4);

  return estimatedInputTokens + maxOut;
}

/**
 * reserve(licenseKey, templateId, requestId, reserveAmount, meta)
 *
 * Atomic transaction:
 * 1) If ai_requests row already exists => idempotent success (no double reserve)
 * 2) Lock wallet row FOR UPDATE
 * 3) Ensure available >= reserveAmount
 * 4) Increase wallets.reserved
 * 5) Insert ai_requests row (status='reserved')
 * 6) Insert ledger row (delta=0, type='reserve')
 */
export async function reserve(licenseKey, templateId, requestId, reserveAmount, meta = {}) {
  if (!licenseKey) throw new Error("Missing licenseKey");
  if (!templateId) throw new Error("Missing templateId");
  if (!requestId) throw new Error("Missing requestId");

  const amount = Number(reserveAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid reserveAmount");
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1) Idempotency check
    const existingReq = await client.query(
      `SELECT status, reserved_amount, actual_used
       FROM public.ai_requests
       WHERE license_key = $1 AND template_id = $2 AND request_id = $3`,
      [licenseKey, templateId, requestId]
    );

    if (existingReq.rowCount > 0) {
      await client.query("COMMIT");
      return { ok: true, idempotent: true, existing: existingReq.rows[0] };
    }

    // 2) Lock wallet
    const walletRes = await client.query(
      `SELECT balance, reserved
       FROM public.wallets
       WHERE license_key = $1
       FOR UPDATE`,
      [licenseKey]
    );

    if (walletRes.rowCount === 0) {
      throw new Error("Wallet not found");
    }

    const { balance, reserved } = walletRes.rows[0];
    const available = balance - reserved;

    // 3) Check funds
    if (available < amount) {
      throw new Error("Insufficient credits");
    }

    // 4) Increase reserved
    await client.query(
      `UPDATE public.wallets
       SET reserved = reserved + $1,
           updated_at = now()
       WHERE license_key = $2`,
      [amount, licenseKey]
    );

    // 5) Insert ai_requests
    await client.query(
      `INSERT INTO public.ai_requests
       (request_id, license_key, template_id, status, reserved_amount)
       VALUES ($1, $2, $3, 'reserved', $4)`,
      [requestId, licenseKey, templateId, amount]
    );

    // 6) Ledger entry (your schema uses delta)
    await client.query(
      `INSERT INTO public.ledger
       (license_key, delta, reason, type, request_id, meta)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [licenseKey, 0, "reserve", "reserve", requestId, meta]
    );

    await client.query("COMMIT");
    return { ok: true, idempotent: false };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * finalize(licenseKey, templateId, requestId, reservedAmount, actualUsed, meta, responseJson)
 *
 * Atomic transaction:
 * - lock ai_requests row FOR UPDATE (prevents double-finalize)
 * - lock wallet row FOR UPDATE
 * - decrease wallets.reserved by reservedAmount
 * - decrease wallets.balance by actualUsed
 * - update ai_requests => completed + actual_used + response_json
 * - ledger debit row with delta=-actualUsed
 */
export async function finalize(
  licenseKey,
  templateId,
  requestId,
  reservedAmount,
  actualUsed,
  meta = {},
  responseJson = null
) {
  if (!licenseKey) throw new Error("Missing licenseKey");
  if (!templateId) throw new Error("Missing templateId");
  if (!requestId) throw new Error("Missing requestId");

  const reservedAmt = Number(reservedAmount);
  const used = Number(actualUsed);

  if (!Number.isFinite(reservedAmt) || reservedAmt <= 0) throw new Error("Invalid reservedAmount");
  if (!Number.isFinite(used) || used < 0) throw new Error("Invalid actualUsed");
  if (used > reservedAmt) throw new Error("actualUsed cannot exceed reservedAmount");

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Lock request row
    const reqRes = await client.query(
      `SELECT status
       FROM public.ai_requests
       WHERE license_key = $1 AND template_id = $2 AND request_id = $3
       FOR UPDATE`,
      [licenseKey, templateId, requestId]
    );

    if (reqRes.rowCount === 0) {
      throw new Error("ai_requests row not found for finalize()");
    }

    if (reqRes.rows[0].status === "completed") {
      await client.query("COMMIT");
      return { ok: true, idempotent: true };
    }

    // Lock wallet
    const walletRes = await client.query(
      `SELECT balance, reserved
       FROM public.wallets
       WHERE license_key = $1
       FOR UPDATE`,
      [licenseKey]
    );

    if (walletRes.rowCount === 0) throw new Error("Wallet not found");

    // Update wallet: release reserved + charge actual
    await client.query(
      `UPDATE public.wallets
       SET reserved = reserved - $1,
           balance = balance - $2,
           updated_at = now()
       WHERE license_key = $3`,
      [reservedAmt, used, licenseKey]
    );

    // Update request
    await client.query(
      `UPDATE public.ai_requests
       SET status = 'completed',
           actual_used = $1,
           response_json = $2
       WHERE license_key = $3 AND template_id = $4 AND request_id = $5`,
      [used, responseJson, licenseKey, templateId, requestId]
    );

    // Ledger debit
    await client.query(
      `INSERT INTO public.ledger
       (license_key, delta, reason, type, request_id, meta)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [licenseKey, -used, "finalize", "debit", requestId, meta]
    );

    await client.query("COMMIT");
    return { ok: true, idempotent: false };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * failAndRelease(licenseKey, templateId, requestId, reservedAmount, meta, errorMessage)
 *
 * If OpenAI fails after reserve:
 * - release reserved
 * - mark request failed
 * - write ledger release entry (delta=0)
 */
export async function failAndRelease(
  licenseKey,
  templateId,
  requestId,
  reservedAmount,
  meta = {},
  errorMessage = null
) {
  if (!licenseKey) throw new Error("Missing licenseKey");
  if (!templateId) throw new Error("Missing templateId");
  if (!requestId) throw new Error("Missing requestId");

  const reservedAmt = Number(reservedAmount);
  if (!Number.isFinite(reservedAmt) || reservedAmt <= 0) throw new Error("Invalid reservedAmount");

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Lock request row
    const reqRes = await client.query(
      `SELECT status
       FROM public.ai_requests
       WHERE license_key = $1 AND template_id = $2 AND request_id = $3
       FOR UPDATE`,
      [licenseKey, templateId, requestId]
    );

    if (reqRes.rowCount === 0) {
      throw new Error("ai_requests row not found for failAndRelease()");
    }

    if (reqRes.rows[0].status === "failed") {
      await client.query("COMMIT");
      return { ok: true, idempotent: true };
    }

    // Lock wallet
    const walletRes = await client.query(
      `SELECT reserved
       FROM public.wallets
       WHERE license_key = $1
       FOR UPDATE`,
      [licenseKey]
    );
    if (walletRes.rowCount === 0) throw new Error("Wallet not found");

    // Release reserved
    await client.query(
      `UPDATE public.wallets
       SET reserved = reserved - $1,
           updated_at = now()
       WHERE license_key = $2`,
      [reservedAmt, licenseKey]
    );

    // Mark failed
    await client.query(
      `UPDATE public.ai_requests
       SET status = 'failed',
           error_message = $1
       WHERE license_key = $2 AND template_id = $3 AND request_id = $4`,
      [errorMessage, licenseKey, templateId, requestId]
    );

    // Ledger release entry
    await client.query(
      `INSERT INTO public.ledger
       (license_key, delta, reason, type, request_id, meta)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [licenseKey, 0, "release", "release", requestId, meta]
    );

    await client.query("COMMIT");
    return { ok: true, idempotent: false };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}