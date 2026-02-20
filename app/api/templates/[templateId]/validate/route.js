import { json, readJson } from "@/lib/http";
import { getTemplateConfig } from "@/lib/templates/registry";
import { validateLicenseWallet } from "@/lib/billing";

export async function POST(req, { params }) {
  const templateId = params.templateId;

  const cfg = getTemplateConfig(templateId);
  if (!cfg) return json(404, { error: "Unknown templateId" });

  const body = await readJson(req);
  if (!body || !body.license_key) return json(400, { error: "Missing license_key" });

  const licenseKey = String(body.license_key).trim();

  const result = await validateLicenseWallet(licenseKey);

  return json(200, {
    template_id: templateId,
    valid: result.valid,
    status: result.status,
    balance: result.balance,
    reserved: result.reserved,
    available: result.available,
  });
}