import { requireAdmin } from "@/lib/adminAuth";
import {
  validateLicenseWallet,
  estimateReserve,
  reserve,
  finalize,
  failAndRelease,
} from "@/lib/billing/index.js";
export async function POST(req) {
  const auth = requireAdmin(req);
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const licenseKey = body.licenseKey;
  const templateId = body.templateId || "syllabus_breakdown";

  if (!licenseKey) {
    return Response.json({ error: "Missing licenseKey in JSON body" }, { status: 400 });
  }

  const requestId1 = `devtest_${Date.now()}_1`;
  const requestId2 = `devtest_${Date.now()}_2`;

  const meta = { templateId, source: "devtest-billing" };

  try {
    // 1) Validate wallet
    const w1 = await validateLicenseWallet(licenseKey);

    // 2) Estimate reserve
    const reserveAmount1 = estimateReserve({ hello: "world" }, 100);

    // 3) Reserve (idempotency check included)
    const r1 = await reserve(licenseKey, templateId, requestId1, reserveAmount1, meta);

    // 4) Finalize (charge less than reserve)
    const actualUsed = Math.floor(reserveAmount1 * 0.5);
    const f1 = await finalize(
      licenseKey,
      templateId,
      requestId1,
      reserveAmount1,
      actualUsed,
      meta,
      { ok: true, note: "devtest response" }
    );

    // 5) Reserve + failAndRelease
    const reserveAmount2 = 50;
    await reserve(licenseKey, templateId, requestId2, reserveAmount2, meta);
    const fr = await failAndRelease(
      licenseKey,
      templateId,
      requestId2,
      reserveAmount2,
      meta,
      "simulated failure"
    );

    // 6) Validate wallet again
    const w2 = await validateLicenseWallet(licenseKey);

    return Response.json({
      ok: true,
      initialWallet: w1,
      reserveAmount1,
      reserveResult: r1,
      finalizeResult: f1,
      failAndReleaseResult: fr,
      finalWallet: w2,
      requestIds: { requestId1, requestId2 },
      note: "Check Supabase tables: wallets, ai_requests, ledger",
    });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
