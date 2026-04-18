import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import WorkflowsUI from "./WorkflowsUI";

export const dynamic = "force-dynamic";

export default async function WorkflowsPage() {
  const user = await requireUser();

  const [workflows, stages] = await Promise.all([
    db.workflow.findMany({
      where: { ownerId: user.id },
      orderBy: { updatedAt: "desc" },
    }),
    db.pipelineStage.findMany({
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const stageNames = stages.map((s) => s.name);

  return (
    <WorkflowsUI
      workflows={workflows.map((w) => ({
        id: w.id,
        name: w.name,
        active: w.active,
        trigger: w.trigger as any,
        actions: w.actions as any,
        updatedAt: w.updatedAt.toISOString(),
      }))}
      stageNames={stageNames}
    />
  );
}
