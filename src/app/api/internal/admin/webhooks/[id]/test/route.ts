import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { hmacSign } from "@/lib/crypto";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id } = await params;
  const ep = await db.webhookEndpoint.findUnique({ where: { id } });
  if (!ep) return new Response("Not found", { status: 404 });

  const envelope = {
    id: crypto.randomUUID(),
    event: "PING",
    created_at: new Date().toISOString(),
    data: { hello: "world" },
  };
  const body = JSON.stringify(envelope);
  const signature = hmacSign(body, ep.secret);

  try {
    const res = await fetch(ep.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-crm-event": "PING",
        "x-crm-signature": `sha256=${signature}`,
      },
      body,
    });
    return Response.json({ ok: true, status: res.status });
  } catch (e: any) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
