"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
import { Mail, Phone, GripVertical } from "lucide-react";

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
  name: string;
  value: string;
  currency: string;
  stageId: string;
  stageOrder: number;
  probability: number;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
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

    // Stage reorder
    if (activeId.startsWith("stage:") && overId.startsWith("stage:")) {
      const from = stages.findIndex((s) => "stage:" + s.id === activeId);
      const to = stages.findIndex((s) => "stage:" + s.id === overId);
      if (from === -1 || to === -1 || from === to) return;
      const next = arrayMove(stages, from, to);
      setStages(next);
      void persistStageOrder(next.map((s) => s.id));
      return;
    }

    // Card move
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
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={{ duration: 180 }}>
          {activeCard && (
            <div className="opp-card dragging" style={{ width: 260 }}>
              <CardContent card={activeCard} />
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
}: {
  stage: Stage;
  cards: Card[];
  isGhost: boolean;
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
      <StageColumnContent stage={stage} cards={cards} dragHandle={{ attributes, listeners }} />
    </div>
  );
}

function StageColumnContent({
  stage,
  cards,
  dragHandle,
}: {
  stage: Stage;
  cards: Card[];
  dragHandle: { attributes: any; listeners: any };
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
          <DraggableKanbanCard key={c.id} card={c} />
        ))}
      </div>
    </>
  );
}

function DraggableKanbanCard({ card }: { card: Card }) {
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
      className={"opp-card " + (isDragging ? "opacity-30" : "")}
    >
      <CardContent card={card} />
    </div>
  );
}

function CardContent({ card }: { card: Card }) {
  const logoColor = pickLogoColor(card.leadName);
  const letter = (card.leadName.trim()[0] ?? "?").toUpperCase();
  return (
    <>
      <div className="title-row">
        <span className={`logo ${logoColor}`}>{letter}</span>
        <Link
          href={`/app/leads/${card.leadId}`}
          className="truncate hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {card.leadName}
        </Link>
      </div>

      <div className="meta-row">
        <div className="avatar">{card.ownerInitials ?? "–"}</div>
        <div className="value-col">
          <div className="value-amt truncate">
            {Number(card.value) > 0 ? formatMoney(card.value, card.currency) : card.name}
          </div>
          <div className="value-prob">{card.probability}%</div>
        </div>
      </div>

      {card.contactName && (
        <div className="footer-row">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span className="truncate flex-1 text-ink/80">{card.contactName}</span>
          <div className="flex items-center gap-1 text-muted">
            {card.contactEmail && <Mail size={11} />}
            {card.contactPhone && <Phone size={11} />}
          </div>
        </div>
      )}
    </>
  );
}
