import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { dispatchWebhook } from "@/lib/webhooks";
import { z } from "zod";

const Body = z.object({
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  customData: z.record(z.any()).optional(),
});

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const json = await req.json();
  const data = Body.parse(json);
  const contact = await db.contact.create({
    data: {
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      email: data.email || null,
      phone: data.phone || null,
      company: data.company || null,
      title: data.title || null,
      customData: data.customData ?? {},
      ownerId: user.id,
    },
  });
  void dispatchWebhook("CONTACT_CREATED", contact);
  return Response.json(contact);
}
