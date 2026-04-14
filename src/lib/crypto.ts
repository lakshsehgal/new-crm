import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

export function hmacSign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export function verifyHmac(body: string, secret: string, signature: string): boolean {
  const expected = hmacSign(body, secret);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Generate an API key in the form `nck_<prefix>_<secret>`.
 * - prefix: first 8 chars after `nck_` (shown in UI for identification)
 * - Returned value is the full plaintext key (shown once)
 */
export function generateApiKey(): { plaintext: string; prefix: string; hash: string } {
  const raw = randomBytes(32).toString("base64url");
  const prefix = raw.slice(0, 8);
  const plaintext = `nck_${prefix}_${raw.slice(8)}`;
  return { plaintext, prefix, hash: sha256(plaintext) };
}

export function randomSecret(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}
