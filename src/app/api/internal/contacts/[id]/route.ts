import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { dispatchWebhook } from "@/lib/webhooks";
import { z } from "zod";

const Patch = z.object({
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  email: z.string().email().or(z.literal("")).nullable().optional(),
  phone: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  leadId: z.string().nullable().optional(),
  customData: z.record(z.any()).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireUser();
  const { id } = await params;
  const data = Patch.parse(await req.json());
  const contact = await db.contact.update({
    where: { id },
    data: {
      ...data,
      email: data.email === "" ? null : data.email,
    },
  });
  void dispatchWebhook("CONTACT_UPDATED", contact);
  return Response.json(contact);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireUser();
  const { id } = await params;
  await db.contact.delete({ where: { id } });
  void dispatchWebhook("CONTACT_DELETED", { id });
  return Response.json({ ok: true });
}
