import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Cross-entity search used by the global top-bar search. Returns a small
 * batch of leads, contacts, and opportunities matching the query.
 */
export async function GET(req: NextRequest) {
  await requireUser();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return Response.json({ leads: [], contacts: [], opportunities: [] });
  }

  const ci = { contains: q, mode: "insensitive" as const };

  const [leads, contacts, opportunities] = await Promise.all([
    db.lead.findMany({
      where: {
        OR: [{ name: ci }, { url: ci }, { description: ci }, { address: ci }],
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: { id: true, name: true, status: true },
    }),
    db.contact.findMany({
      where: {
        OR: [
          { firstName: ci },
          { lastName: ci },
          { email: ci },
          { phone: ci },
          { lead: { name: ci } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        lead: { select: { id: true, name: true } },
      },
    }),
    db.opportunity.findMany({
      where: {
        OR: [{ name: ci }, { lead: { name: ci } }],
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: {
        id: true,
        name: true,
        value: true,
        lead: { select: { id: true, name: true } },
        stage: { select: { name: true } },
      },
    }),
  ]);

  return Response.json({ leads, contacts, opportunities });
}
