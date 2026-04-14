import { NextRequest } from "next/server";
import { authenticateApiRequest, unauthorized } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { dispatchWebhook } from "@/lib/webhooks";
import { z } from "zod";

const Body = z.object({
  name: z.string().min(1),
  status: z.enum(["POTENTIAL", "QUALIFIED", "CUSTOMER", "BAD_FIT", "CHURNED"]).optional(),
  url: z.string().url().optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  // Optional first contact fields
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const caller = await authenticateApiRequest(req);
  if (!caller) return unauthorized();
  const leads = await db.lead.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: { contacts: true, opportunities: true },
  });
  return Response.json({ data: leads });
}

export async function POST(req: NextRequest) {
  const caller = await authenticateApiRequest(req);
  if (!caller) return unauthorized();
  const data = Body.parse(await req.json());

  const shouldMakeContact =
    !!(data.contactName || data.contactEmail || data.contactPhone);
  const [firstName, ...rest] = (data.contactName ?? "").trim().split(/\s+/);
  const lastName = rest.join(" ") || undefined;

  const result = await db.$transaction(async (tx) => {
    const lead = await tx.lead.create({
      data: {
        name: data.name,
        status: data.status ?? "POTENTIAL",
        url: data.url ?? null,
        description: data.description ?? null,
        address: data.address ?? null,
        ownerId: caller.userId,
      },
    });
    let contact = null;
    if (shouldMakeContact) {
      contact = await tx.contact.create({
        data: {
          firstName: firstName || null,
          lastName: lastName || null,
          email: data.contactEmail || null,
          phone: data.contactPhone || null,
          leadId: lead.id,
          ownerId: caller.userId,
        },
      });
    }
    return { lead, contact };
  });
  void dispatchWebhook("LEAD_CREATED", result.lead);
  if (result.contact) void dispatchWebhook("CONTACT_CREATED", result.contact);
  return Response.json(result, { status: 201 });
}
