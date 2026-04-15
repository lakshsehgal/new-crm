import Link from "next/link";
import { db } from "@/lib/db";
import KanbanBoard from "./KanbanBoard";
import OppListView from "./OppListView";
import KanbanOptions from "./KanbanOptions";
import { Kanban, ListTree } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ pipeline?: string; view?: string }>;
}) {
  const sp = await searchParams;
  const pipelineId = sp.pipeline;
  const view = sp.view === "list" ? "list" : "board";

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
      activities: {
        select: { type: true, createdAt: true, body: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: [{ stageOrder: "asc" }, { updatedAt: "desc" }],
  });

  const cards = opps.map((o) => {
    const primaryContact = o.lead.contacts[0];
    const contactName = primaryContact
      ? [primaryContact.firstName, primaryContact.lastName]
          .filter(Boolean)
          .join(" ") || primaryContact.email
      : null;
    const lastActivity = o.activities[0];
    return {
      id: o.id,
      leadId: o.leadId,
      leadName: o.lead.name,
      leadStatus: o.lead.status as string,
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
      lastNote: lastActivity?.type === "NOTE" ? lastActivity.body : null,
      lastTouchpointAt: lastActivity?.createdAt?.toISOString() ?? null,
      ownerInitials: o.owner
        ? (o.owner.name || o.owner.email || "?")
            .split(/[\s._-]+/)
            .slice(0, 2)
            .map((p) => p[0]?.toUpperCase())
            .join("")
        : null,
      ownerEmail: o.owner?.email ?? null,
      updatedAt: o.updatedAt.toISOString(),
    };
  });

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-5 pb-4 bg-white border-b border-border">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[22px] font-semibold tracking-tight">
            {active.name}
          </h1>
          <div className="flex items-center gap-2">
            <ViewToggle currentView={view} pipelineId={active.id} />
            {pipelines.length > 1 && (
              <form className="flex items-center gap-2">
                {view === "list" && <input type="hidden" name="view" value="list" />}
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
            {view === "board" && <KanbanOptions />}
          </div>
        </div>
      </div>

      {view === "board" ? (
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
          initialCards={cards}
        />
      ) : (
        <OppListView
          stages={stages.map((s) => ({ id: s.id, name: s.name, isWon: s.isWon, isLost: s.isLost }))}
          rows={cards}
        />
      )}
    </div>
  );
}

function ViewToggle({
  currentView,
  pipelineId,
}: {
  currentView: "board" | "list";
  pipelineId: string;
}) {
  return (
    <div className="inline-flex border border-border rounded-md overflow-hidden text-[13px]">
      <Link
        href={`/app/opportunities?pipeline=${pipelineId}`}
        className={
          "flex items-center gap-1.5 px-2.5 py-1 " +
          (currentView === "board"
            ? "bg-accentSoft text-accent"
            : "bg-white text-muted hover:bg-surface")
        }
      >
        <Kanban size={13} /> Board
      </Link>
      <Link
        href={`/app/opportunities?pipeline=${pipelineId}&view=list`}
        className={
          "flex items-center gap-1.5 px-2.5 py-1 border-l border-border " +
          (currentView === "list"
            ? "bg-accentSoft text-accent"
            : "bg-white text-muted hover:bg-surface")
        }
      >
        <ListTree size={13} /> List
      </Link>
    </div>
  );
}
