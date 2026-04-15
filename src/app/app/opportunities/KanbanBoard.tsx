"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  closestCorners,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { formatMoney } from "@/lib/utils";
import { Mail, Phone, GripVertical, MessageSquarePlus, X } from "lucide-react";
import { readKanbanAppearance, type KanbanAppearance } from "./KanbanOptions";

type Stage = {
  id: string;
  name: string;
  probability: number;
  isWon: boolean;
  isLost: boolean;
  colorIdx: number;
};
type Card = {
  id: string;
  leadId: string;
  leadName: string;
  leadStatus: string;
  name: string;
  value: string;
  currency: string;
  stageId: string;
  stageOrder: number;
  probability: number;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  lastNote: string | null;
  lastTouchpointAt: string | null;
  ownerInitials: string | null;
};

const STAGE_COLORS = ["s-yellow", "s-orange", "s-amber", "s-blue", "s-purple", "s-teal", "s-rose"];
const LOGO_COLORS = [
  "bg-emerald-500", "bg-blue-500", "bg-amber-500", "bg-rose-500",
  "bg-purple-500", "bg-teal-500", "bg-orange-500", "bg-indigo-500",
];

function stageClass(stage: Stage): string {
  if (stage.isWon) return "s-emerald";
  if (stage.isLost) return "s-red";
  return STAGE_COLORS[stage.colorIdx % STAGE_COLORS.length];
}

function pickLogoColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return LOGO_COLORS[h % LOGO_COLORS.length];
}

const STATUS_BADGE: Record<string, string> = {
  POTENTIAL: "bg-amber-50 text-amber-700 border-amber-200",
  QUALIFIED: "bg-blue-50 text-blue-700 border-blue-200",
  CUSTOMER: "bg-emerald-50 text-emerald-700 border-emerald-200",
  BAD_FIT: "bg-rose-50 text-rose-700 border-rose-200",
  CHURNED: "bg-gray-100 text-gray-600 border-gray-200",
};

function relTime(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

const DEFAULT_APPEARANCE: KanbanAppearance = {
  density: "full",
  showLeadStatus: false,
  showContact: true,
  showLastNote: false,
  showLastTouchpoint: false,
};

export default function KanbanBoard({
  pipelineId,
  stages: initialStages,
  initialCards,
}: {
  pipelineId: string;
  stages: Stage[];
  initialCards: Card[];
}) {
  const [stages, setStages] = useState(initialStages);
  const [cards, setCards] = useState(initialCards);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [appearance, setAppearance] = useState<KanbanAppearance>(DEFAULT_APPEARANCE);

  // Hydrate appearance from localStorage + listen for changes from the Options popover
  useEffect(() => {
    setAppearance(readKanbanAppearance());
    function onChange() {
      setAppearance(readKanbanAppearance());
    }
    window.addEventListener("newcrm:kanban-appearance", onChange);
    return () => window.removeEventListener("newcrm:kanban-appearance", onChange);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const byStage = useMemo(() => {
    const map = new Map<string, Card[]>();
    stages.forEach((s) => map.set(s.id, []));
    [...cards]
      .sort((a, b) => a.stageOrder - b.stageOrder)
      .forEach((c) => map.get(c.stageId)?.push(c));
    return map;
  }, [stages, cards]);

  async function persistCardMove(cardId: string, stageId: string, stageOrder: number) {
    const res = await fetch(`/api/internal/opportunities/${cardId}/move`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stageId, stageOrder }),
    });
    if (!res.ok) toast.error("Failed to move card");
  }

  async function persistStageOrder(stageIds: string[]) {
    const res = await fetch(
      `/api/internal/pipelines/${pipelineId}/stages/reorder`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stageIds }),
      },
    );
    if (!res.ok) toast.error("Failed to reorder stages");
    else toast.success("Stages reordered");
  }

  function onDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    if (id.startsWith("card:")) setActiveCardId(id.slice(5));
    else if (id.startsWith("stage:")) setActiveStageId(id.slice(6));
  }

  function onDragEnd(e: DragEndEvent) {
    const activeId = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    setActiveCardId(null);
    setActiveStageId(null);
    if (!overId) return;

    if (activeId.startsWith("stage:") && overId.startsWith("stage:")) {
      const from = stages.findIndex((s) => "stage:" + s.id === activeId);
      const to = stages.findIndex((s) => "stage:" + s.id === overId);
      if (from === -1 || to === -1 || from === to) return;
      const next = arrayMove(stages, from, to);
      setStages(next);
      void persistStageOrder(next.map((s) => s.id));
      return;
    }

    if (!activeId.startsWith("card:")) return;
    const cardId = activeId.slice(5);
    const active = cards.find((c) => c.id === cardId);
    if (!active) return;

    let destStageId = active.stageId;
    let destIndex = 0;

    if (overId.startsWith("drop:")) {
      destStageId = overId.slice(5);
      destIndex = byStage.get(destStageId)?.length ?? 0;
    } else if (overId.startsWith("card:")) {
      const targetId = overId.slice(5);
      const target = cards.find((c) => c.id === targetId);
      if (!target) return;
      destStageId = target.stageId;
      const list = (byStage.get(destStageId) ?? []).filter((c) => c.id !== cardId);
      destIndex = list.findIndex((c) => c.id === target.id);
      if (destIndex < 0) destIndex = list.length;
    } else return;

    const next = cards.filter((c) => c.id !== cardId);
    const inStage = next.filter((c) => c.stageId === destStageId);
    const others = next.filter((c) => c.stageId !== destStageId);
    inStage.splice(destIndex, 0, { ...active, stageId: destStageId });
    const renumbered = inStage.map((c, i) => ({ ...c, stageOrder: i }));
    setCards([...others, ...renumbered]);
    void persistCardMove(cardId, destStageId, destIndex);
  }

  const activeCard = activeCardId ? cards.find((c) => c.id === activeCardId) : null;
  const activeStage = activeStageId ? stages.find((s) => s.id === activeStageId) : null;

  return (
    <div className="flex-1 overflow-hidden">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={stages.map((s) => "stage:" + s.id)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="kanban h-full">
            {stages.map((stage) => (
              <SortableStageColumn
                key={stage.id}
                stage={stage}
                cards={byStage.get(stage.id) ?? []}
                isGhost={activeStageId === stage.id}
                appearance={appearance}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={{ duration: 180 }}>
          {activeCard && (
            <div className="opp-card dragging" style={{ width: 260 }}>
              <CardContent card={activeCard} appearance={appearance} />
            </div>
          )}
          {activeStage && (
            <div className="kanban-col" style={{ width: 260 }}>
              <div className="kanban-col-head">
                <div className={`stage-chip ${stageClass(activeStage)}`}>{activeStage.name}</div>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function SortableStageColumn({
  stage,
  cards,
  isGhost,
  appearance,
}: {
  stage: Stage;
  cards: Card[];
  isGhost: boolean;
  appearance: KanbanAppearance;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: "stage:" + stage.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || isGhost ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="kanban-col">
      <StageColumnContent
        stage={stage}
        cards={cards}
        dragHandle={{ attributes, listeners }}
        appearance={appearance}
      />
    </div>
  );
}

function StageColumnContent({
  stage,
  cards,
  dragHandle,
  appearance,
}: {
  stage: Stage;
  cards: Card[];
  dragHandle: { attributes: any; listeners: any };
  appearance: KanbanAppearance;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "drop:" + stage.id });
  const total = cards.reduce((sum, c) => sum + Number(c.value || 0), 0);
  return (
    <>
      <div className="kanban-col-head">
        <div className="flex items-center gap-1.5">
          <button
            className="stage-grip"
            {...dragHandle.attributes}
            {...dragHandle.listeners}
            aria-label="Drag stage"
          >
            <GripVertical size={12} />
          </button>
          <div className={`stage-chip ${stageClass(stage)}`}>{stage.name}</div>
        </div>
        <div className="mt-1.5 text-[12px] text-muted">
          {cards.length} {cards.length === 1 ? "opportunity" : "opportunities"}
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px]">
          <span className="text-mutedSoft uppercase tracking-wide">Total value</span>
          <span className="text-ink font-semibold text-[13px]">
            {total > 0 ? formatMoney(total) : "₹0"}
          </span>
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={"kanban-col-body " + (isOver ? "bg-accentSoft/40" : "")}
      >
        {cards.length === 0 && (
          <div className="text-center text-[12px] text-mutedSoft py-6">
            No opportunities
          </div>
        )}
        {cards.map((c) => (
          <DraggableKanbanCard key={c.id} card={c} appearance={appearance} />
        ))}
      </div>
    </>
  );
}

function DraggableKanbanCard({
  card,
  appearance,
}: {
  card: Card;
  appearance: KanbanAppearance;
}) {
  const router = useRouter();
  const { setNodeRef, attributes, listeners, transform, isDragging } = useDraggable({
    id: "card:" + card.id,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        if (isDragging) return;
        const target = e.target as HTMLElement;
        if (target.closest("a") || target.closest("[data-stop-card-click]")) return;
        router.push(`/app/opportunities/${card.id}`);
      }}
      className={"opp-card " + (isDragging ? "opacity-30" : "")}
    >
      <CardContent card={card} appearance={appearance} />
    </div>
  );
}

function CardContent({
  card,
  appearance,
}: {
  card: Card;
  appearance: KanbanAppearance;
}) {
  const logoColor = pickLogoColor(card.leadName);
  const letter = (card.leadName.trim()[0] ?? "?").toUpperCase();
  const minimal = appearance.density === "minimal";

  return (
    <>
      <div className="title-row">
        <span className={`logo ${logoColor}`}>{letter}</span>
        <Link
          href={`/app/leads/${card.leadId}`}
          className="truncate hover:underline flex-1"
          onClick={(e) => e.stopPropagation()}
        >
          {card.leadName}
        </Link>
        {appearance.showLeadStatus && (
          <span
            className={
              "badge text-[9px] px-1 py-0 " +
              (STATUS_BADGE[card.leadStatus] ?? "")
            }
          >
            {card.leadStatus.replace("_", " ")}
          </span>
        )}
      </div>

      <div className="meta-row">
        <div className="avatar">{card.ownerInitials ?? "–"}</div>
        <div className="value-col">
          <div className="value-amt truncate">
            {Number(card.value) > 0 ? formatMoney(card.value) : card.name}
          </div>
          <div className="value-prob">{card.probability}%</div>
        </div>
        <div data-stop-card-click>
          <QuickNote oppId={card.id} />
        </div>
      </div>

      {!minimal && appearance.showContact && card.contactName && (
        <div className="footer-row">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span className="truncate flex-1 text-ink/80">{card.contactName}</span>
          <div className="flex items-center gap-1 text-muted">
            {card.contactEmail && <Mail size={11} />}
            {card.contactPhone && <Phone size={11} />}
          </div>
        </div>
      )}

      {!minimal && appearance.showLastNote && card.lastNote && (
        <div className="footer-row">
          <span className="text-mutedSoft uppercase text-[9px] tracking-wide">
            Note
          </span>
          <span className="text-[12px] text-muted truncate flex-1">
            {card.lastNote}
          </span>
        </div>
      )}

      {!minimal && appearance.showLastTouchpoint && card.lastTouchpointAt && (
        <div className="footer-row">
          <span className="text-mutedSoft uppercase text-[9px] tracking-wide">
            Last touch
          </span>
          <span className="text-[12px] text-muted">
            {relTime(card.lastTouchpointAt)}
          </span>
        </div>
      )}
    </>
  );
}

function QuickNote({ oppId }: { oppId: string }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function save() {
    if (!note.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/internal/activities", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          opportunityId: oppId,
          type: "NOTE",
          title: note.slice(0, 80),
          body: note,
        }),
      });
      if (!res.ok) {
        toast.error("Failed to add note");
        return;
      }
      toast.success("Note added");
      setNote("");
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative" data-stop-card-click>
      <button
        type="button"
        className="size-6 grid place-items-center rounded text-mutedSoft hover:bg-surface hover:text-ink"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        title="Quick note"
      >
        <MessageSquarePlus size={13} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 card shadow-pop z-30 p-3 w-[260px] pop-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wide text-mutedSoft font-semibold">
              Quick note
            </span>
            <button
              type="button"
              className="size-5 grid place-items-center rounded text-muted hover:bg-surface"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
              }}
            >
              <X size={12} />
            </button>
          </div>
          <textarea
            autoFocus
            className="input min-h-[80px] text-[13px]"
            placeholder="Type a quick note…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void save();
              }
            }}
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-[10px] text-mutedSoft">⌘+Enter to save</span>
            <button
              className="btn-primary"
              disabled={saving || !note.trim()}
              onClick={save}
              type="button"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
