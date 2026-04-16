import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const Body = z.object({
  name: z.string().min(1),
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
  pinned: z.boolean().default(false),
});

export async function GET() {
  const user = await requireUser();
  const views = await db.smartView.findMany({
    where: { ownerId: user.id },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
  });
  return Response.json(views);
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const data = Body.parse(await req.json());
  const view = await db.smartView.create({
    data: {
      name: data.name,
      entity: data.entity,
      filters: data.filters as any,
      pinned: data.pinned,
      ownerId: user.id,
    },
  });
  return Response.json(view, { status: 201 });
}
