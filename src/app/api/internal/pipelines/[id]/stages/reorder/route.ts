import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const Body = z.object({
  stageIds: z.array(z.string()).min(1),
});

/**
 * Reorder stages within a pipeline. Any authenticated user can reorder for now;
 * tighten to ADMIN via requireAdmin if you want stricter control.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireUser();
  const { id: pipelineId } = await params;
  const { stageIds } = Body.parse(await req.json());

  const existing = await db.pipelineStage.findMany({
    where: { pipelineId },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((s) => s.id));
  if (stageIds.some((id) => !existingIds.has(id))) {
    return Response.json({ error: "Unknown stage id" }, { status: 400 });
  }
  if (stageIds.length !== existing.length) {
    return Response.json({ error: "Must include every stage" }, { status: 400 });
  }

  await db.$transaction(
    stageIds.map((id, order) =>
      db.pipelineStage.update({ where: { id }, data: { order } }),
    ),
  );

  return Response.json({ ok: true });
}
