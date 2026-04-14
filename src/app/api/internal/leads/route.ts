import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { dispatchWebhook } from "@/lib/webhooks";
import { z } from "zod";

/**
 * POST /api/internal/leads
 *
 * Primary payload: { companyName, contactName } — creates a Contact and a Lead
 * atomically. This matches the Close-style "one contact, one lead/opportunity"
 * flow: the Lead is the company + primary contact.
 *
 * Also still accepts the old shape { title, source?, value?, contactId? } for
 * direct API usage.
 */
const Body = z.union([
  z.object({
    companyName: z.string().min(1),
    contactName: z.string().optional(),
    source: z.string().optional(),
    value: z.union([z.string(), z.number()]).optional(),
  }),
  z.object({
    title: z.string().min(1),
    source: z.string().nullable().optional(),
    value: z.union([z.string(), z.number()]).optional(),
    contactId: z.string().nullable().optional(),
    status: z
      .enum(["NEW", "CONTACTED", "QUALIFIED", "UNQUALIFIED", "WON", "LOST"])
      .optional(),
  }),
]);

function splitName(full?: string): { firstName?: string; lastName?: string } {
  if (!full) return {};
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0] };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts.at(-1) };
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const data = Body.parse(await req.json());

  if ("companyName" in data) {
    const { firstName, lastName } = splitName(data.contactName);
    const result = await db.$transaction(async (tx) => {
      const contact = await tx.contact.create({
        data: {
          firstName: firstName ?? null,
          lastName: lastName ?? null,
          company: data.companyName,
          ownerId: user.id,
        },
      });
      const lead = await tx.lead.create({
        data: {
          title: data.companyName,
          source: data.source ?? null,
          value: data.value ? Number(data.value) : null,
          contactId: contact.id,
          ownerId: user.id,
        },
      });
      return { contact, lead };
    });
    void dispatchWebhook("CONTACT_CREATED", result.contact);
    void dispatchWebhook("LEAD_CREATED", result.lead);
    return Response.json(result);
  }

  // Back-compat direct lead creation
  const lead = await db.lead.create({
    data: {
      title: data.title,
      source: data.source ?? null,
      value: data.value ? Number(data.value) : null,
      contactId: data.contactId ?? null,
      status: data.status ?? "NEW",
      ownerId: user.id,
    },
  });
  void dispatchWebhook("LEAD_CREATED", lead);
  return Response.json({ lead });
}
