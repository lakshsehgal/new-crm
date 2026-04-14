import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { dispatchWebhook } from "@/lib/webhooks";
import { z } from "zod";

const Body = z.object({
  title: z.string().min(1),
  source: z.string().nullable().optional(),
  value: z.union([z.string(), z.number()]).optional(),
  contactId: z.string().optional().nullable(),
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "UNQUALIFIED", "WON", "LOST"]).optional(),
});

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const data = Body.parse(await req.json());
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
  return Response.json(lead);
}
