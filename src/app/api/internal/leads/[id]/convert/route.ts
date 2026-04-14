import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { dispatchWebhook } from "@/lib/webhooks";
import { z } from "zod";

/**
 * Convert a Lead into an Opportunity. Enforces the invariant that a Contact is
 * linked to EITHER a Lead XOR an Opportunity: the Lead row is deleted after
 * the Opportunity is created.
 */
const Body = z.object({
  pipelineId: z.string().optional(),
  stageId: z.string().optional(),
  name: z.string().optional(),
  value: z.union([z.string(), z.number()]).optional(),
  currency: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await params;
  const data = Body.parse(await req.json().catch(() => ({})));

  const lead = await db.lead.findUnique({
    where: { id },
    include: { contact: true },
  });
  if (!lead) return Response.json({ error: "Lead not found" }, { status: 404 });

  // Resolve pipeline & starting stage
  let pipelineId = data.pipelineId;
  if (!pipelineId) {
    const p = await db.pipeline.findFirst({ where: { isDefault: true } });
    pipelineId = p?.id;
  }
  if (!pipelineId) {
    const p = await db.pipeline.findFirst();
    pipelineId = p?.id;
  }
  if (!pipelineId) {
    return Response.json({ error: "No pipeline configured" }, { status: 400 });
  }

  const stage = data.stageId
    ? await db.pipelineStage.findUnique({ where: { id: data.stageId } })
    : await db.pipelineStage.findFirst({
        where: { pipelineId },
        orderBy: { order: "asc" },
      });
  if (!stage) return Response.json({ error: "No stages in pipeline" }, { status: 400 });

  const count = await db.opportunity.count({ where: { stageId: stage.id } });

  const result = await db.$transaction(async (tx) => {
    const opp = await tx.opportunity.create({
      data: {
        name: data.name ?? lead.title,
        value:
          data.value !== undefined
            ? Number(data.value)
            : lead.value
              ? Number(lead.value)
              : 0,
        currency: data.currency ?? "USD",
        pipelineId: pipelineId!,
        stageId: stage.id,
        stageOrder: count,
        contactId: lead.contactId,
        ownerId: lead.ownerId ?? user.id,
      },
    });
    await tx.lead.delete({ where: { id: lead.id } });
    return opp;
  });

  void dispatchWebhook("LEAD_DELETED", { id: lead.id });
  void dispatchWebhook("OPPORTUNITY_CREATED", result);
  return Response.json(result);
}
