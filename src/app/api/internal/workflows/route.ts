import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const Body = z.object({
  name: z.string().min(1),
  active: z.boolean().default(true),
  trigger: z.object({
    event: z.string(),
    conditions: z.record(z.any()).optional(),
  }),
  actions: z.array(
    z.object({
      type: z.string(),
      config: z.record(z.any()),
    }),
  ),
});

export async function GET() {
  const user = await requireUser();
  const workflows = await db.workflow.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
  });
  return Response.json(workflows);
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const data = Body.parse(await req.json());
  const wf = await db.workflow.create({
    data: {
      name: data.name,
      active: data.active,
      trigger: data.trigger as any,
      actions: data.actions as any,
      ownerId: user.id,
    },
  });
  return Response.json(wf, { status: 201 });
}
