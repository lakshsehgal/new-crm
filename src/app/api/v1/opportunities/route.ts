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
  contactId: z.string().optional(),
  contactEmail: z.string().email().optional(),
});

export async function GET(req: NextRequest) {
  const caller = await authenticateApiRequest(req);
  if (!caller) return unauthorized();
  const opps = await db.opportunity.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: { stage: true, contact: true },
  });
  return Response.json({ data: opps });
}

export async function POST(req: NextRequest) {
  const caller = await authenticateApiRequest(req);
  if (!caller) return unauthorized();
  const data = Body.parse(await req.json());

  // Resolve pipeline + stage
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

  let contactId = data.contactId;
  if (!contactId && data.contactEmail) {
    const existing = await db.contact.findFirst({ where: { email: data.contactEmail } });
    contactId =
      existing?.id ??
      (await db.contact.create({ data: { email: data.contactEmail, ownerId: caller.userId } })).id;
  }

  const order = await db.opportunity.count({ where: { stageId } });
  const opp = await db.opportunity.create({
    data: {
      name: data.name,
      value: data.value ? Number(data.value) : 0,
      currency: data.currency ?? "USD",
      pipelineId,
      stageId,
      stageOrder: order,
      contactId: contactId ?? null,
      ownerId: caller.userId,
    },
  });
  void dispatchWebhook("OPPORTUNITY_CREATED", opp);
  return Response.json(opp, { status: 201 });
}
