import { NextRequest } from "next/server";
import { authenticateApiRequest, unauthorized } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { dispatchWebhook } from "@/lib/webhooks";
import { z } from "zod";

const Body = z.object({
  title: z.string(),
  source: z.string().optional(),
  value: z.union([z.string(), z.number()]).optional(),
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "UNQUALIFIED", "WON", "LOST"]).optional(),
  contactId: z.string().optional(),
  // allow attaching to an existing contact by email
  contactEmail: z.string().email().optional(),
});

export async function GET(req: NextRequest) {
  const caller = await authenticateApiRequest(req);
  if (!caller) return unauthorized();
  const leads = await db.lead.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: { contact: true },
  });
  return Response.json({ data: leads });
}

export async function POST(req: NextRequest) {
  const caller = await authenticateApiRequest(req);
  if (!caller) return unauthorized();
  const data = Body.parse(await req.json());

  let contactId = data.contactId;
  if (!contactId && data.contactEmail) {
    const existing = await db.contact.findFirst({ where: { email: data.contactEmail } });
    contactId =
      existing?.id ??
      (
        await db.contact.create({
          data: { email: data.contactEmail, ownerId: caller.userId },
        })
      ).id;
  }

  const lead = await db.lead.create({
    data: {
      title: data.title,
      source: data.source ?? null,
      value: data.value ? Number(data.value) : null,
      status: data.status ?? "NEW",
      contactId: contactId ?? null,
      ownerId: caller.userId,
    },
  });
  void dispatchWebhook("LEAD_CREATED", lead);
  return Response.json(lead, { status: 201 });
}
