import { json, readJson } from "@/lib/http";
import { getTemplateConfig } from "@/lib/templates/registry";
import { rateLimit } from "@/lib/rateLimit";
import {
  validateLicenseWallet,
  estimateReserve,
  reserve,
  finalize,
  failAndRelease,
} from "@/lib/billing";
import { callModel } from "@/lib/openai";

function getClientIp(req) {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  return "unknown";
}

export async function POST(req, { params }) {
  const templateId = params.templateId;

  const cfg = getTemplateConfig(templateId);
  if (!cfg) return json(404, { error: "Unknown templateId" });

  const body = await readJson(req);
  if (!body) return json(400, { error: "Invalid JSON body" });

  const licenseKey = String(body.license_key || "").trim();
  const requestId = String(body.request_id || "").trim();
  const payload = body.payload ?? {};

  if (!licenseKey) return json(400, { error: "Missing license_key" });
  if (!requestId) return json(400, { error: "Missing request_id" });

  // Validate license/wallet
  const v = await validateLicenseWallet(licenseKey);
  if (!v.valid) return json(403, { error: "Invalid license", status: v.status });

  // Rate limit (do BEFORE reserve)
  const ip = getClientIp(req);
  const rl = rateLimit(licenseKey, ip, templateId, { rpm: cfg.rpm });
  if (!rl.allowed) {
    return json(429, { error: "Rate limit exceeded", retry_after_seconds: rl.retryAfterSeconds });
  }

  // Estimate reserve
  const maxOut = cfg.maxOutputTokens;
  const reserveAmount = estimateReserve(payload, maxOut);
  if (reserveAmount > cfg.maxReserveCap) {
    return json(400, { error: "Reserve estimate exceeds cap", reserve_required: reserveAmount });
  }

  const meta = { template_id: templateId, ip, max_output_tokens: maxOut };

  // Reserve (idempotent)
  try {
    await reserve(licenseKey, templateId, requestId, reserveAmount, meta);
  } catch (e) {
    return json(402, { error: "Insufficient available credits or reserve failed" });
  }

  // OpenAI call
  try {
    const messages = [
      { role: "system", content: "You are an assistant inside an Excel template. Be concise and actionable." },
      { role: "user", content: JSON.stringify(payload) },
    ];

    const ai = await callModel({
      model: cfg.model,
      messages,
      maxOutputTokens: maxOut,
    });

    const actualUsed = Number(ai.totalTokens || 0);

    await finalize(
      licenseKey,
      templateId,
      requestId,
      reserveAmount,
      actualUsed,
      meta,
      { text: ai.text, usage: ai.usage }
    );

    return json(200, {
      template_id: templateId,
      request_id: requestId,
      ok: true,
      answer: ai.text,
      usage: ai.usage,
    });
  } catch (e) {
    const msg = e?.message ? String(e.message) : "OpenAI call failed";
    try {
      await failAndRelease(licenseKey, templateId, requestId, reserveAmount, meta, msg);
    } catch {}
    return json(500, { ok: false, error: msg });
  }
}