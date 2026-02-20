import { json, readJson } from "@/lib/http";
import { getTemplateConfig } from "@/lib/templates/registry";
import { validateLicenseWallet, estimateReserve } from "@/lib/billing";

export async function POST(req, { params }) {
  const templateId = params.templateId;

  const cfg = getTemplateConfig(templateId);
  if (!cfg) return json(404, { error: "Unknown templateId" });

  const body = await readJson(req);
  if (!body || !body.license_key) return json(400, { error: "Missing license_key" });

  const licenseKey = String(body.license_key).trim();
  const payload = body.payload ?? {};

  const v = await validateLicenseWallet(licenseKey);

  // Always return a quote-shaped response, even when invalid
  if (!v.valid) {
    return json(200, {
      template_id: templateId,
      valid: false,
      status: v.status,
      balance: v.balance ?? 0,
      reserved: v.reserved ?? 0,
      available: v.available ?? 0,
      reserve_required: null,
      allowed: false,
      recommended_max_output_tokens: cfg.maxOutputTokens,
    });
  }

  const maxOut = cfg.maxOutputTokens;
  const reserveRequired = estimateReserve(payload, maxOut);

  if (reserveRequired > cfg.maxReserveCap) {
    return json(400, { error: "Reserve estimate exceeds cap", reserve_required: reserveRequired });
  }

  return json(200, {
    template_id: templateId,
    valid: true,
    status: v.status,
    balance: v.balance,
    reserved: v.reserved,
    available: v.available,
    reserve_required: reserveRequired,
    allowed: v.available >= reserveRequired,
    recommended_max_output_tokens: maxOut,
  });
}