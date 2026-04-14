"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { toast } from "sonner";
import { formatMoney } from "@/lib/utils";
import NewOppButton from "./NewOppButton";

type Stage = { id: string; name: string; probability: number; isWon: boolean; isLost: boolean };
type Card = {
  id: string;
  name: string;
  value: string;
  currency: string;
  stageId: string;
  stageOrder: number;
  contactName: string | null;
};

export default function KanbanBoard({
  pipelineId,
  stages,
  initialCards,
}: {
  pipelineId: string;
  stages: Stage[];
  initialCards: Card[];
}) {
  const [cards, setCards] = useState(initialCards);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const byStage = useMemo(() => {
    const map = new Map<string, Card[]>();
    stages.forEach((s) => map.set(s.id, []));
    [...cards]
      .sort((a, b) => a.stageOrder - b.stageOrder)
      .forEach((c) => map.get(c.stageId)?.push(c));
    return map;
  }, [stages, cards]);

  async function persist(cardId: string, stageId: string, stageOrder: number) {
    const res = await fetch(`/api/internal/opportunities/${cardId}/move`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stageId, stageOrder }),
    });
    if (!res.ok) toast.error("Failed to move");
  }

  function onDragEnd(e: DragEndEvent) {
    const activeId = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId) return;

    const [overKind, overIdent] = overId.split(":");
    const active = cards.find((c) => c.id === activeId);
    if (!active) return;

    let destStageId = active.stageId;
    let destIndex = 0;

    if (overKind === "stage") {
      destStageId = overIdent;
      destIndex = byStage.get(destStageId)?.length ?? 0;
    } else if (overKind === "card") {
      const target = cards.find((c) => c.id === overIdent);
      if (!target) return;
      destStageId = target.stageId;
      const list = (byStage.get(destStageId) ?? []).filter((c) => c.id !== activeId);
      destIndex = list.findIndex((c) => c.id === target.id);
      if (destIndex < 0) destIndex = list.length;
    } else return;

    const next = cards.filter((c) => c.id !== activeId);
    const inStage = next.filter((c) => c.stageId === destStageId);
    const others = next.filter((c) => c.stageId !== destStageId);
    inStage.splice(destIndex, 0, { ...active, stageId: destStageId });
    const renumbered = inStage.map((c, i) => ({ ...c, stageOrder: i }));
    setCards([...others, ...renumbered]);
    void persist(activeId, destStageId, destIndex);
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <NewOppButton pipelineId={pipelineId} stages={stages} />
      </div>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="kanban">
          {stages.map((stage) => (
            <StageColumn key={stage.id} stage={stage} cards={byStage.get(stage.id) ?? []} />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

function StageColumn({ stage, cards }: { stage: Stage; cards: Card[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: `stage:${stage.id}` });
  const total = cards.reduce((sum, c) => sum + Number(c.value || 0), 0);
  return (
    <div className="kanban-col">
      <div className="px-3 py-2 border-b border-border flex items-center justify-between sticky top-0 bg-surface/80 backdrop-blur">
        <div>
          <div className="text-sm font-medium">
            {stage.name}
            <span className="ml-2 text-xs text-muted">{cards.length}</span>
          </div>
          <div className="text-xs text-muted">{formatMoney(total)}</div>
        </div>
        {stage.isWon && <span className="badge bg-emerald-50 text-emerald-700 border-emerald-200">Won</span>}
        {stage.isLost && <span className="badge bg-red-50 text-red-700 border-red-200">Lost</span>}
      </div>
      <div
        ref={setNodeRef}
        className={"flex-1 p-2 space-y-2 min-h-[120px] " + (isOver ? "bg-accentSoft/40" : "")}
      >
        {cards.map((c) => <KanbanCard key={c.id} card={c} />)}
      </div>
    </div>
  );
}

function KanbanCard({ card }: { card: Card }) {
  const { setNodeRef, attributes, listeners, transform, isDragging } = useDraggable({
    id: `card:${card.id}`,
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
      className={"kanban-card " + (isDragging ? "opacity-60" : "")}
    >
      <div className="text-sm font-medium truncate">{card.name}</div>
      <div className="flex items-center justify-between mt-1">
        <div className="text-xs text-muted truncate">{card.contactName ?? "—"}</div>
        <div className="text-xs font-medium">{formatMoney(card.value, card.currency)}</div>
      </div>
    </div>
  );
}
