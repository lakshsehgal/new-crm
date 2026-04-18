import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { syncEmailsForAddress } from "@/lib/gmail";
import { z } from "zod";

const Body = z.object({
  leadId: z.string().optional(),
  contactId: z.string().optional(),
});

/**
 * Pull the full Gmail history for every contact on a lead (or just one
 * contact). Fetches messages by from:/to: query so we're not limited to the
 * last N messages the cron has synced.
 */
export async function POST(req: NextRequest) {
  const user = await requireUser();
  const data = Body.parse(await req.json());

  let emails: string[] = [];
  if (data.contactId) {
    const c = await db.contact.findUnique({
      where: { id: data.contactId },
      select: { email: true },
    });
    if (c?.email) emails = [c.email];
  } else if (data.leadId) {
    const contacts = await db.contact.findMany({
      where: { leadId: data.leadId, email: { not: null } },
      select: { email: true },
    });
    emails = contacts.map((c) => c.email!).filter(Boolean);
  }

  if (emails.length === 0) {
    return Response.json({ ok: true, synced: 0 });
  }

  let total = 0;
  for (const addr of emails) {
    try {
      total += await syncEmailsForAddress(user.id, addr, 100);
    } catch (err) {
      console.error(`[gmail] sync for ${addr} failed:`, err);
    }
  }

  return Response.json({ ok: true, synced: total, addresses: emails.length });
}
