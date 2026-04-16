import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildLeadWhere, type SmartViewFilters } from "@/lib/smart-view-filters";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await params;
  const view = await db.smartView.findFirst({
    where: { id, ownerId: user.id },
  });
  if (!view) return new Response("Not found", { status: 404 });

  const filters = view.filters as unknown as SmartViewFilters;

  if (view.entity === "LEAD") {
    const where = buildLeadWhere(filters);
    const leads = await db.lead.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 200,
      include: {
        contacts: { select: { id: true, firstName: true, lastName: true, email: true, phone: true }, take: 3 },
        opportunities: { select: { id: true, value: true } },
        owner: { select: { email: true } },
      },
    });
    return Response.json({ entity: "LEAD", data: leads });
  }

  // Future: OPPORTUNITY entity support
  return Response.json({ entity: view.entity, data: [] });
}
