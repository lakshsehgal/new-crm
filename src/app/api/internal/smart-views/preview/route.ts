import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildLeadWhere, type SmartViewFilters } from "@/lib/smart-view-filters";
import { z } from "zod";

const Body = z.object({
  entity: z.enum(["LEAD", "OPPORTUNITY"]).default("LEAD"),
  filters: z.object({
    match: z.enum(["all", "any"]).default("all"),
    conditions: z.array(
      z.object({
        field: z.string(),
        operator: z.string(),
        value: z.any().optional(),
      }),
    ),
  }),
});

export async function POST(req: NextRequest) {
  await requireUser();
  const data = Body.parse(await req.json());

  if (data.entity === "LEAD") {
    const where = buildLeadWhere(data.filters);
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
    return Response.json({ entity: "LEAD", data: leads, count: leads.length });
  }

  return Response.json({ entity: data.entity, data: [], count: 0 });
}
