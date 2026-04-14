import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import PipelinesUI from "./PipelinesUI";

export const dynamic = "force-dynamic";

export default async function AdminPipelinesPage() {
  await requireAdmin();
  const pipelines = await db.pipeline.findMany({
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    include: { stages: { orderBy: { order: "asc" } } },
  });

  return (
    <div className="p-6 space-y-4">
      <header>
        <h1 className="text-xl font-semibold">Pipelines</h1>
        <p className="text-sm text-muted">Customize your sales stages and win probabilities.</p>
      </header>
      <PipelinesUI
        pipelines={pipelines.map((p) => ({
          id: p.id,
          name: p.name,
          isDefault: p.isDefault,
          stages: p.stages.map((s) => ({
            id: s.id,
            name: s.name,
            probability: s.probability,
            isWon: s.isWon,
            isLost: s.isLost,
            order: s.order,
          })),
        }))}
      />
    </div>
  );
}
