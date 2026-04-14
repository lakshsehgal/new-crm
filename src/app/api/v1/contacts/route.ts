import { NextRequest } from "next/server";
import { authenticateApiRequest, unauthorized } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { dispatchWebhook } from "@/lib/webhooks";
import { z } from "zod";

const Body = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  title: z.string().optional(),
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
            { company: { contains: q, mode: "insensitive" } },
          ],
        }
      : {},
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
  return Response.json({ data: contacts });
}

export async function POST(req: NextRequest) {
  const caller = await authenticateApiRequest(req);
  if (!caller) return unauthorized();
  const data = Body.parse(await req.json());
  const contact = await db.contact.create({
    data: { ...data, ownerId: caller.userId },
  });
  void dispatchWebhook("CONTACT_CREATED", contact);
  return Response.json(contact, { status: 201 });
}
