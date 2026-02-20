import { rateLimit } from "./lib/rateLimit/index.js";

const license = "LIC";
const ip = "127.0.0.1";
const template = "syllabus_breakdown";

try {
  for (let i = 0; i < 25; i++) {
    rateLimit(license, ip, template, { maxRequests: 5, windowMs: 60000 });
    console.log("allowed", i + 1);
  }
} catch (e) {
  console.log("blocked as expected:", e.message);
}
