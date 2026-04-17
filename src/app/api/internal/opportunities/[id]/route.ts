import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { dispatchWebhookAfter, dispatchOpportunityEventAfter } from "@/lib/webhooks";
import { z } from "zod";

const Patch = z.object({
  name: z.string().min(1).optional(),
  value: z.union([z.string(), z.number()]).nullable().optional(),
  currency: z.string().optional(),
  stageId: z.string().optional(),
  expectedCloseAt: z.string().datetime().nullable().optional(),
  finalQuote: z.string().nullable().optional(),
  sow: z.array(z.string()).optional(),
  customData: z.record(z.any()).optional(),
});

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireUser();
  const { id } = await params;
  const opp = await db.opportunity.findUnique({
    where: { id },
    include: { lead: true, stage: true, owner: true, pipeline: true },
  });
  if (!opp) return new Response("Not found", { status: 404 });
  return Response.json(opp);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireUser();
  const { id } = await params;
  const data = Patch.parse(await req.json());

  const update: Record<string, any> = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.value !== undefined) update.value = data.value == null ? 0 : Number(data.value);
  if (data.currency !== undefined) update.currency = data.currency;
  if (data.stageId !== undefined) update.stageId = data.stageId;
  if (data.expectedCloseAt !== undefined)
    update.expectedCloseAt = data.expectedCloseAt ? new Date(data.expectedCloseAt) : null;
  if (data.finalQuote !== undefined) update.finalQuote = data.finalQuote || null;
  if (data.sow !== undefined) update.sow = data.sow;
  if (data.customData !== undefined) update.customData = data.customData;

  // If stage changed, potentially also set closedAt
  if (data.stageId) {
    const stage = await db.pipelineStage.findUnique({ where: { id: data.stageId } });
    if (stage) {
      update.closedAt = stage.isWon || stage.isLost ? new Date() : null;
    }
  }

  const opp = await db.opportunity.update({ where: { id }, data: update });

  if (data.stageId) dispatchOpportunityEventAfter("OPPORTUNITY_STAGE_CHANGED", opp.id);
  else dispatchOpportunityEventAfter("OPPORTUNITY_UPDATED", opp.id);

  return Response.json(opp);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireUser();
  const { id } = await params;
  await db.opportunity.delete({ where: { id } });
  dispatchWebhookAfter("OPPORTUNITY_DELETED", { id });
  return Response.json({ ok: true });
}
