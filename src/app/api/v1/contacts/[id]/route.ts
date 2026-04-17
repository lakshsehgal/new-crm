import { NextRequest } from "next/server";
import { authenticateApiRequest, unauthorized } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { dispatchWebhookAfter } from "@/lib/webhooks";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const caller = await authenticateApiRequest(req);
  if (!caller) return unauthorized();
  const { id } = await params;
  const contact = await db.contact.findUnique({ where: { id } });
  if (!contact) return new Response("Not found", { status: 404 });
  return Response.json(contact);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const caller = await authenticateApiRequest(req);
  if (!caller) return unauthorized();
  const { id } = await params;
  const body = await req.json();
  const contact = await db.contact.update({ where: { id }, data: body });
  dispatchWebhookAfter("CONTACT_UPDATED", contact);
  return Response.json(contact);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const caller = await authenticateApiRequest(req);
  if (!caller) return unauthorized();
  const { id } = await params;
  await db.contact.delete({ where: { id } });
  dispatchWebhookAfter("CONTACT_DELETED", { id });
  return Response.json({ ok: true });
}
