import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { dispatchLeadEventAfter, dispatchWebhookAfter } from "@/lib/webhooks";
import { z } from "zod";

/**
 * POST /api/internal/leads — create a Lead (company). Optionally seed a first
 * contact for the lead. The Lead owns Contacts and Opportunities.
 */
const Body = z.object({
  name: z.string().min(1),
  url: z.string().url().optional().or(z.literal("")),
  description: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(["POTENTIAL", "QUALIFIED", "INTERESTED", "CUSTOMER", "BAD_FIT", "CHURNED"]).optional(),
  // Optional first contact
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
});

function splitName(full?: string): { firstName?: string; lastName?: string } {
  if (!full) return {};
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0] };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts.at(-1) };
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const data = Body.parse(await req.json());

  const { firstName, lastName } = splitName(data.contactName);
  const shouldMakeContact =
    !!(data.contactName || data.contactEmail || data.contactPhone);

  const result = await db.$transaction(async (tx) => {
    const lead = await tx.lead.create({
      data: {
        name: data.name,
        url: data.url || null,
        description: data.description || null,
        address: data.address || null,
        status: data.status ?? "POTENTIAL",
        ownerId: user.id,
      },
    });
    let contact = null;
    if (shouldMakeContact) {
      contact = await tx.contact.create({
        data: {
          firstName: firstName ?? null,
          lastName: lastName ?? null,
          email: data.contactEmail || null,
          phone: data.contactPhone || null,
          leadId: lead.id,
          ownerId: user.id,
        },
      });
    }
    return { lead, contact };
  });

  dispatchLeadEventAfter("LEAD_CREATED", result.lead.id);
  if (result.contact) dispatchWebhookAfter("CONTACT_CREATED", result.contact);
  return Response.json(result);
}
