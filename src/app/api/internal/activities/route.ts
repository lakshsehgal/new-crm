import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { dispatchWebhook } from "@/lib/webhooks";
import { z } from "zod";

const Body = z.object({
  type: z.enum(["NOTE", "CALL", "MEETING", "TASK", "EMAIL"]),
  title: z.string().min(1),
  body: z.string().optional(),
  dueAt: z.string().datetime().optional(),
  leadId: z.string().optional(),
  contactId: z.string().optional(),
  opportunityId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const data = Body.parse(await req.json());

  // If contactId is given but no leadId, inherit from contact
  let leadId = data.leadId;
  if (!leadId && data.contactId) {
    const c = await db.contact.findUnique({
      where: { id: data.contactId },
      select: { leadId: true },
    });
    leadId = c?.leadId ?? undefined;
  }

  const activity = await db.activity.create({
    data: {
      type: data.type,
      title: data.title,
      body: data.body,
      dueAt: data.dueAt ? new Date(data.dueAt) : null,
      leadId: leadId ?? null,
      contactId: data.contactId,
      opportunityId: data.opportunityId,
      userId: user.id,
    },
  });
  void dispatchWebhook("ACTIVITY_CREATED", activity);
  return Response.json(activity);
}
