import { db } from "@/lib/db";
import KanbanBoard from "./KanbanBoard";

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ pipeline?: string }>;
}) {
  const { pipeline: pipelineId } = await searchParams;
  const pipelines = await db.pipeline.findMany({
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  if (pipelines.length === 0) {
    return (
      <div className="p-6">
        <div className="card p-6 text-sm text-muted">
          No pipelines yet. Ask an admin to create one in Admin → Pipelines.
        </div>
      </div>
    );
  }
  const active = pipelines.find((p) => p.id === pipelineId) ?? pipelines[0];
  const stages = await db.pipelineStage.findMany({
    where: { pipelineId: active.id },
    orderBy: { order: "asc" },
  });
  const opps = await db.opportunity.findMany({
    where: { pipelineId: active.id },
    include: { contact: true },
    orderBy: [{ stageOrder: "asc" }, { updatedAt: "desc" }],
  });

  return (
    <div className="p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Opportunities</h1>
          <p className="text-sm text-muted">Drag cards between stages to update.</p>
        </div>
        <form className="flex items-center gap-2">
          <select name="pipeline" defaultValue={active.id} className="input w-60">
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button className="btn">Switch</button>
        </form>
      </header>

      <KanbanBoard
        pipelineId={active.id}
        stages={stages.map((s) => ({ id: s.id, name: s.name, probability: s.probability, isWon: s.isWon, isLost: s.isLost }))}
        initialCards={opps.map((o) => ({
          id: o.id,
          name: o.name,
          value: o.value.toString(),
          currency: o.currency,
          stageId: o.stageId,
          stageOrder: o.stageOrder,
          contactName: o.contact ? [o.contact.firstName, o.contact.lastName].filter(Boolean).join(" ") : null,
        }))}
      />
    </div>
  );
}
