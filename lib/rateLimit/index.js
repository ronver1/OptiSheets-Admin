// Simple in-memory rate limiter.
// Works for local dev and single-instance deployments.
// For multi-instance production, use Redis/Upstash later.

const store = new Map();

/**
 * rateLimit(licenseKey, ip, templateId, opts?)
 *
 * Example policy:
 * - 20 requests per 60 seconds per (licenseKey + templateId + ip)
 */
export function rateLimit(licenseKey, ip, templateId, opts = {}) {
  const windowMs = opts.windowMs ?? 60_000; // 1 minute
  const maxRequests = opts.maxRequests ?? 20;

  if (!licenseKey) throw new Error("Missing licenseKey for rateLimit");
  if (!templateId) throw new Error("Missing templateId for rateLimit");

  const ipKey = ip || "unknown-ip";
  const key = `${licenseKey}:${templateId}:${ipKey}`;

  const now = Date.now();
  const entry = store.get(key);

  if (!entry) {
    store.set(key, { windowStart: now, count: 1 });
    return;
  }

  // Reset window
  if (now - entry.windowStart > windowMs) {
    store.set(key, { windowStart: now, count: 1 });
    return;
  }

  // Enforce limit
  if (entry.count >= maxRequests) {
    throw new Error("Rate limit exceeded");
  }

  entry.count += 1;
}

/**
 * Optional helper: clear limiter state (useful in tests).
 */
export function _rateLimitResetAll() {
  store.clear();
}
