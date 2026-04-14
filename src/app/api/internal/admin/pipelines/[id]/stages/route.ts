import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const Body = z.object({
  name: z.string().min(1),
  probability: z.number().int().min(0).max(100).optional(),
  isWon: z.boolean().optional(),
  isLost: z.boolean().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id: pipelineId } = await params;
  const data = Body.parse(await req.json());
  const count = await db.pipelineStage.count({ where: { pipelineId } });
  const stage = await db.pipelineStage.create({
    data: {
      pipelineId,
      name: data.name,
      order: count,
      probability: data.probability ?? 0,
      isWon: !!data.isWon,
      isLost: !!data.isLost,
    },
  });
  return Response.json(stage);
}
