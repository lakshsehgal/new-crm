import { db } from "@/lib/db";
import KanbanBoard from "./KanbanBoard";
import NewOppButton from "./NewOppButton";
import { Link2, SlidersHorizontal, ArrowUpDown, ChevronDown } from "lucide-react";

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
    include: { contact: true, owner: true },
    orderBy: [{ stageOrder: "asc" }, { updatedAt: "desc" }],
  });

  // Top search / call bar (decorative placeholder to match Close layout)
  return (
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <header className="h-12 border-b border-border flex items-center gap-3 px-4 bg-white flex-shrink-0">
        <div className="flex-1 max-w-xl relative">
          <input
            className="w-full rounded-md border border-border bg-surface pl-8 pr-3 py-1.5 text-sm outline-none focus:bg-white focus:border-accent"
            placeholder="Search..."
          />
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
        </div>
      </header>

      {/* Page header */}
      <div className="px-6 pt-5 pb-4 bg-white">
        <div className="flex items-center justify-between">
          <h1 className="text-[22px] font-semibold tracking-tight">
            {active.name}
          </h1>
          <button className="btn-ghost" title="Copy view link">
            <Link2 size={16} />
          </button>
        </div>

        {/* Filter pills */}
        <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <form>
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
            </form>
            <button className="pill-muted">
              <span className="text-muted">Close date:</span>
              <span className="font-medium text-ink">All Time</span>
              <ChevronDown size={12} />
            </button>
            <button className="pill">
              All Leads
              <ChevronDown size={12} />
            </button>
            <button className="pill">
              All Users
              <ChevronDown size={12} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button className="pill">
              <ArrowUpDown size={13} /> Actual Value
              <span className="badge ml-1 !text-[10px]">ANNUALIZED</span>
            </button>
            <button className="pill">
              <SlidersHorizontal size={13} /> Options
            </button>
            <NewOppButton pipelineId={active.id} stages={stages.map((s) => ({ id: s.id, name: s.name }))} />
          </div>
        </div>
      </div>

      <KanbanBoard
        pipelineId={active.id}
        stages={stages.map((s, idx) => ({
          id: s.id,
          name: s.name,
          probability: s.probability,
          isWon: s.isWon,
          isLost: s.isLost,
          colorIdx: idx,
        }))}
        initialCards={opps.map((o) => {
          const stage = stages.find((s) => s.id === o.stageId);
          return {
            id: o.id,
            name: o.name,
            value: o.value.toString(),
            currency: o.currency,
            stageId: o.stageId,
            stageOrder: o.stageOrder,
            probability: stage?.probability ?? 0,
            contactName: o.contact
              ? [o.contact.firstName, o.contact.lastName].filter(Boolean).join(" ") || o.contact.email || ""
              : null,
            contactEmail: o.contact?.email ?? null,
            contactPhone: o.contact?.phone ?? null,
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
