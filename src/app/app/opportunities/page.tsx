import { db } from "@/lib/db";
import KanbanBoard from "./KanbanBoard";
import { ChevronDown } from "lucide-react";

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
          No pipelines yet. Create one in Admin → Pipelines.
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
    include: {
      lead: {
        include: {
          contacts: { take: 1, orderBy: { createdAt: "asc" } },
        },
      },
      owner: true,
    },
    orderBy: [{ stageOrder: "asc" }, { updatedAt: "desc" }],
  });

  return (
    <div className="flex flex-col h-screen">
      <div className="px-6 pt-5 pb-4 bg-white border-b border-border">
        <div className="flex items-center justify-between">
          <h1 className="text-[22px] font-semibold tracking-tight">{active.name}</h1>
        </div>

        {pipelines.length > 1 && (
          <form className="mt-3 flex items-center gap-2">
            <span className="label">Pipeline:</span>
            <select
              name="pipeline"
              defaultValue={active.id}
              className="pill cursor-pointer pr-8 appearance-none"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 8px center",
              }}
            >
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button className="btn">Switch</button>
          </form>
        )}
      </div>

      <KanbanBoard
        stages={stages.map((s, idx) => ({
          id: s.id,
          name: s.name,
          probability: s.probability,
          isWon: s.isWon,
          isLost: s.isLost,
          colorIdx: idx,
        }))}
        initialCards={opps.map((o) => {
          const primaryContact = o.lead.contacts[0];
          const contactName = primaryContact
            ? [primaryContact.firstName, primaryContact.lastName]
                .filter(Boolean)
                .join(" ") || primaryContact.email
            : null;
          return {
            id: o.id,
            leadId: o.leadId,
            leadName: o.lead.name,
            name: o.name,
            value: o.value.toString(),
            currency: o.currency,
            stageId: o.stageId,
            stageOrder: o.stageOrder,
            probability:
              stages.find((s) => s.id === o.stageId)?.probability ?? 0,
            contactName: contactName ?? null,
            contactEmail: primaryContact?.email ?? null,
            contactPhone: primaryContact?.phone ?? null,
            ownerInitials: o.owner
              ? (o.owner.name || o.owner.email || "?")
                  .split(/[\s._-]+/)
                  .slice(0, 2)
                  .map((p) => p[0]?.toUpperCase())
                  .join("")
              : null,
          };
        })}
      />
    </div>
  );
}
