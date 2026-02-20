import pkg from "./lib/billing/index.js";

const {
  reserve,
  finalize,
  failAndRelease,
  validateLicenseWallet,
  estimateReserve,
} = pkg;

const LICENSE = "OS-7719B2EB-07AB67FC-A8EEB511";
const TEMPLATE = "syllabus_breakdown";

function randomId() {
  return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function run() {
  console.log("1) validateLicenseWallet...");
  const w1 = await validateLicenseWallet(LICENSE);
  console.log("wallet:", w1);

  console.log("\n2) estimateReserve...");
  const reserveAmount = estimateReserve({ hello: "world" }, 600);
  console.log("reserveAmount:", reserveAmount);

  const requestId = randomId();
  const meta = { templateId: TEMPLATE, note: "billing test" };

  console.log("\n3) reserve...");
  const r = await reserve(LICENSE, TEMPLATE, requestId, reserveAmount, meta);
  console.log("reserve result:", r);

  console.log("\n4) reserve again (idempotency check)...");
  const r2 = await reserve(LICENSE, TEMPLATE, requestId, reserveAmount, meta);
  console.log("reserve again result:", r2);

  console.log("\n5) finalize (charge less than reserved)...");
  const actualUsed = Math.floor(reserveAmount * 0.5);
  const f = await finalize(LICENSE, TEMPLATE, requestId, reserveAmount, actualUsed, meta, { ok: true });
  console.log("finalize result:", f);

  console.log("\n6) validate wallet after finalize...");
  const w2 = await validateLicenseWallet(LICENSE);
  console.log("wallet:", w2);

  console.log("\n7) reserve + failAndRelease...");
  const requestId2 = randomId();
  const reserveAmount2 = 500;
  await reserve(LICENSE, TEMPLATE, requestId2, reserveAmount2, meta);
  const fr = await failAndRelease(LICENSE, TEMPLATE, requestId2, reserveAmount2, meta, "simulated error");
  console.log("failAndRelease result:", fr);

  console.log("\n8) validate wallet after failAndRelease...");
  const w3 = await validateLicenseWallet(LICENSE);
  console.log("wallet:", w3);

  console.log("\nDONE.");
}

run().catch((e) => {
  console.error("TEST FAILED:", e.message);
  process.exit(1);
});
