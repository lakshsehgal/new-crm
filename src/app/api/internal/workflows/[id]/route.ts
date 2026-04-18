import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const Patch = z.object({
  name: z.string().min(1).optional(),
  active: z.boolean().optional(),
  trigger: z
    .object({
      event: z.string(),
      conditions: z.record(z.any()).optional(),
    })
    .optional(),
  actions: z
    .array(z.object({ type: z.string(), config: z.record(z.any()) }))
    .optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await params;
  const data = Patch.parse(await req.json());
  const wf = await db.workflow.updateMany({
    where: { id, ownerId: user.id },
    data: data as any,
  });
  if (wf.count === 0) return new Response("Not found", { status: 404 });
  const updated = await db.workflow.findUnique({ where: { id } });
  return Response.json(updated);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await params;
  await db.workflow.deleteMany({ where: { id, ownerId: user.id } });
  return Response.json({ ok: true });
}
