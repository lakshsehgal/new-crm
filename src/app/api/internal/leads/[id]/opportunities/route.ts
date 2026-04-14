import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { dispatchWebhook } from "@/lib/webhooks";
import { z } from "zod";

const Body = z.object({
  name: z.string().min(1),
  value: z.union([z.string(), z.number()]).optional(),
  currency: z.string().optional(),
  pipelineId: z.string().optional(),
  stageId: z.string().optional(),
});

/**
 * Create a new Opportunity inside a Lead. Defaults to the default pipeline's
 * first stage if not specified.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id: leadId } = await params;
  const data = Body.parse(await req.json());

  let pipelineId = data.pipelineId;
  if (!pipelineId) {
    const def = await db.pipeline.findFirst({ where: { isDefault: true } });
    pipelineId = def?.id ?? (await db.pipeline.findFirst())?.id;
  }
  if (!pipelineId) {
    return Response.json({ error: "No pipeline configured" }, { status: 400 });
  }

  let stage = data.stageId
    ? await db.pipelineStage.findUnique({ where: { id: data.stageId } })
    : await db.pipelineStage.findFirst({
        where: { pipelineId },
        orderBy: { order: "asc" },
      });
  if (!stage) return Response.json({ error: "No stages in pipeline" }, { status: 400 });

  const count = await db.opportunity.count({ where: { stageId: stage.id } });
  const opp = await db.opportunity.create({
    data: {
      name: data.name,
      value: data.value ? Number(data.value) : 0,
      currency: data.currency ?? "INR",
      pipelineId,
      stageId: stage.id,
      stageOrder: count,
      leadId,
      ownerId: user.id,
    },
  });
  void dispatchWebhook("OPPORTUNITY_CREATED", opp);
  return Response.json(opp);
}
