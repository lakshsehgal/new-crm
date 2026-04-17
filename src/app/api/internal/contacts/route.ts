import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { dispatchWebhookAfter } from "@/lib/webhooks";
import { z } from "zod";

/**
 * Generic contact create. In the UI, prefer creating contacts scoped to a
 * Lead via /api/internal/leads/:id/contacts — this exists for API parity.
 */
const Body = z.object({
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  leadId: z.string().optional().nullable(),
  customData: z.record(z.any()).optional(),
});

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const data = Body.parse(await req.json());
  const contact = await db.contact.create({
    data: {
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      email: data.email || null,
      phone: data.phone || null,
      title: data.title || null,
      leadId: data.leadId || null,
      customData: data.customData ?? {},
      ownerId: user.id,
    },
  });
  dispatchWebhookAfter("CONTACT_CREATED", contact);
  return Response.json(contact);
}
