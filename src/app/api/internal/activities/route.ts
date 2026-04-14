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
  contactId: z.string().optional(),
  leadId: z.string().optional(),
  opportunityId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const data = Body.parse(await req.json());
  const activity = await db.activity.create({
    data: {
      type: data.type,
      title: data.title,
      body: data.body,
      dueAt: data.dueAt ? new Date(data.dueAt) : null,
      contactId: data.contactId,
      leadId: data.leadId,
      opportunityId: data.opportunityId,
      userId: user.id,
    },
  });
  void dispatchWebhook("ACTIVITY_CREATED", activity);
  return Response.json(activity);
}
