import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { dispatchOpportunityEventAfter } from "@/lib/webhooks";
import { inheritedCustomData } from "@/lib/opp-inherit";
import { z } from "zod";

const Body = z.object({
  name: z.string().min(1),
  value: z.union([z.string(), z.number()]).optional(),
  currency: z.string().default("INR").optional(),
  pipelineId: z.string(),
  stageId: z.string(),
  leadId: z.string(),
});

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const data = Body.parse(await req.json());
  const count = await db.opportunity.count({ where: { stageId: data.stageId } });
  // Snapshot inherited custom-field values from the parent lead for any
  // field whose scope includes both LEAD and OPPORTUNITY.
  const customData = await inheritedCustomData(data.leadId);
  const opp = await db.opportunity.create({
    data: {
      name: data.name,
      value: data.value ? Number(data.value) : 0,
      currency: data.currency ?? "INR",
      pipelineId: data.pipelineId,
      stageId: data.stageId,
      stageOrder: count,
      leadId: data.leadId,
      ownerId: user.id,
      customData,
    },
  });
  dispatchOpportunityEventAfter("OPPORTUNITY_CREATED", opp.id);
  return Response.json(opp);
}
