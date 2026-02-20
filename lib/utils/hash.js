import crypto from "crypto";
import { stableStringify } from "./json";

export function hashRequest(obj) {
  const text = stableStringify(obj);
  return crypto.createHash("sha256").update(text).digest("hex");
}
