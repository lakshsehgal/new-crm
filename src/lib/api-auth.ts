import { db } from "@/lib/db";
import { sha256 } from "@/lib/crypto";

export type ApiCaller = {
  userId: string;
  apiKeyId: string;
};

/**
 * Authenticate an incoming request using an API key in the `Authorization: Bearer <key>`
 * header, or `x-api-key: <key>`. Returns caller metadata or null.
 */
export async function authenticateApiRequest(req: Request): Promise<ApiCaller | null> {
  const authz = req.headers.get("authorization") ?? "";
  const xkey = req.headers.get("x-api-key") ?? "";
  let key = "";
  if (authz.toLowerCase().startsWith("bearer ")) key = authz.slice(7).trim();
  else if (xkey) key = xkey.trim();
  if (!key.startsWith("nck_")) return null;

  const hash = sha256(key);
  const record = await db.apiKey.findFirst({
    where: { hash, revokedAt: null },
    select: { id: true, userId: true },
  });
  if (!record) return null;

  // Fire-and-forget last-used update
  db.apiKey.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  return { userId: record.userId, apiKeyId: record.id };
}

export function unauthorized(msg = "Unauthorized"): Response {
  return new Response(JSON.stringify({ error: msg }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}
