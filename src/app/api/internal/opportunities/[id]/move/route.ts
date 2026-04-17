import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { dispatchOpportunityEventAfter } from "@/lib/webhooks";
import { z } from "zod";

const Body = z.object({
  stageId: z.string(),
  stageOrder: z.number().int().min(0),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireUser();
  const { id } = await params;
  const { stageId, stageOrder } = Body.parse(await req.json());

  const current = await db.opportunity.findUnique({ where: { id } });
  if (!current) return new Response("Not found", { status: 404 });

  const destStage = await db.pipelineStage.findUnique({ where: { id: stageId } });
  if (!destStage) return new Response("Invalid stage", { status: 400 });

  const stageChanged = current.stageId !== stageId;

  // Re-order destination stage
  await db.$transaction(async (tx) => {
    // Temporarily park the card
    await tx.opportunity.update({
      where: { id },
      data: { stageId, stageOrder: -1 },
    });
    const others = await tx.opportunity.findMany({
      where: { stageId, id: { not: id } },
      orderBy: { stageOrder: "asc" },
      select: { id: true },
    });
    const reordered = [...others];
    reordered.splice(stageOrder, 0, { id });
    await Promise.all(
      reordered.map((row, idx) =>
        tx.opportunity.update({
          where: { id: row.id },
          data: {
            stageOrder: idx,
            ...(row.id === id
              ? {
                  closedAt: destStage.isWon || destStage.isLost ? new Date() : null,
                }
              : {}),
          },
        }),
      ),
    );
  });

  const updated = await db.opportunity.findUnique({
    where: { id },
    include: { stage: true },
  });

  if (stageChanged) {
    dispatchOpportunityEventAfter("OPPORTUNITY_STAGE_CHANGED", id);
  } else {
    dispatchOpportunityEventAfter("OPPORTUNITY_UPDATED", id);
  }
  return Response.json(updated);
}
