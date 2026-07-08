import { NextRequest } from "next/server";
import { authenticateApiRequest, unauthorized } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { dispatchWebhookAfter } from "@/lib/webhooks";
import { z } from "zod";

const Body = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  title: z.string().optional(),
  leadId: z.string().optional(),
  leadName: z.string().optional(),
  customData: z.record(z.any()).optional(),
});

export async function GET(req: NextRequest) {
  const caller = await authenticateApiRequest(req);
  if (!caller) return unauthorized();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const limit = Math.min(100, Number(searchParams.get("limit") ?? 25));

  const contacts = await db.contact.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { lead: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {},
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: { lead: true },
  });
  return Response.json({ data: contacts });
}

export async function POST(req: NextRequest) {
  const caller = await authenticateApiRequest(req);
  if (!caller) return unauthorized();
  const data = Body.parse(await req.json());
  const email = data.email?.trim().toLowerCase() || undefined;

  let leadId = data.leadId;
  if (!leadId && data.leadName) {
    const existing = await db.lead.findFirst({
      where: { name: { equals: data.leadName, mode: "insensitive" } },
      orderBy: { createdAt: "asc" },
    });
    leadId = existing?.id ??
      (await db.lead.create({ data: { name: data.leadName, source: "API", ownerId: caller.userId } })).id;
  }

  // Dedupe by email: update the existing contact instead of creating a twin.
  const existing = email
    ? await db.contact.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        orderBy: { createdAt: "asc" },
      })
    : null;

  const contact = existing
    ? await db.contact.update({
        where: { id: existing.id },
        data: {
          firstName: data.firstName ?? existing.firstName,
          lastName: data.lastName ?? existing.lastName,
          email,
          phone: data.phone ?? existing.phone,
          title: data.title ?? existing.title,
          leadId: leadId ?? existing.leadId,
          customData: {
            ...((existing.customData as Record<string, unknown>) ?? {}),
            ...(data.customData ?? {}),
          },
        },
      })
    : await db.contact.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email,
          phone: data.phone,
          title: data.title,
          leadId: leadId ?? null,
          customData: data.customData,
          ownerId: caller.userId,
        },
      });
  dispatchWebhookAfter(existing ? "CONTACT_UPDATED" : "CONTACT_CREATED", contact);
  return Response.json(contact, { status: existing ? 200 : 201 });
}
