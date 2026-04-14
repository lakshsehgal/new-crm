import { NextRequest } from "next/server";
import { authenticateApiRequest, unauthorized } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { dispatchWebhook } from "@/lib/webhooks";
import { z } from "zod";

const Body = z.object({
  name: z.string(),
  value: z.union([z.string(), z.number()]).optional(),
  currency: z.string().optional(),
  pipelineId: z.string().optional(),
  stageId: z.string().optional(),
  stageName: z.string().optional(),
  leadId: z.string().optional(),
  leadName: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const caller = await authenticateApiRequest(req);
  if (!caller) return unauthorized();
  const opps = await db.opportunity.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: { stage: true, lead: true },
  });
  return Response.json({ data: opps });
}

export async function POST(req: NextRequest) {
  const caller = await authenticateApiRequest(req);
  if (!caller) return unauthorized();
  const data = Body.parse(await req.json());

  let pipelineId = data.pipelineId;
  if (!pipelineId) {
    const def = await db.pipeline.findFirst({ where: { isDefault: true } });
    pipelineId = def?.id;
  }
  if (!pipelineId) return Response.json({ error: "No pipeline" }, { status: 400 });

  let stageId = data.stageId;
  if (!stageId) {
    const stage = data.stageName
      ? await db.pipelineStage.findFirst({ where: { pipelineId, name: data.stageName } })
      : await db.pipelineStage.findFirst({ where: { pipelineId }, orderBy: { order: "asc" } });
    stageId = stage?.id;
  }
  if (!stageId) return Response.json({ error: "Invalid stage" }, { status: 400 });

  // Resolve lead — either by id or upsert by name
  let leadId = data.leadId;
  if (!leadId && data.leadName) {
    const existing = await db.lead.findFirst({ where: { name: data.leadName } });
    leadId = existing?.id ??
      (await db.lead.create({ data: { name: data.leadName, ownerId: caller.userId } })).id;
  }
  if (!leadId) return Response.json({ error: "leadId or leadName required" }, { status: 400 });

  const order = await db.opportunity.count({ where: { stageId } });
  const opp = await db.opportunity.create({
    data: {
      name: data.name,
      value: data.value ? Number(data.value) : 0,
      currency: data.currency ?? "USD",
      pipelineId,
      stageId,
      stageOrder: order,
      leadId,
      ownerId: caller.userId,
    },
  });
  void dispatchWebhook("OPPORTUNITY_CREATED", opp);
  return Response.json(opp, { status: 201 });
}
