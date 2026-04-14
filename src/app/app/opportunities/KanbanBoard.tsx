"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { formatMoney } from "@/lib/utils";
import { Mail, Phone, Pencil, Trash2, Headphones } from "lucide-react";

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
    const activeId = String(e.active.id).replace(/^card:/, "");
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
    <div className="flex-1 overflow-hidden">
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="kanban h-full">
          {stages.map((stage) => (
            <StageColumn
              key={stage.id}
              stage={stage}
              cards={byStage.get(stage.id) ?? []}
            />
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
      <div className="kanban-col-head">
        <div className={`stage-chip ${stageClass(stage)}`}>{stage.name}</div>
        <div className="mt-1.5 text-[12px] text-muted">
          {cards.length} {cards.length === 1 ? "opportunity" : "opportunities"}
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px]">
          <span className="text-mutedSoft uppercase tracking-wide">Annualized value</span>
          <span className="text-ink font-semibold text-[13px]">
            {total > 0 ? formatMoney(total) : "$0"}
          </span>
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={"kanban-col-body " + (isOver ? "bg-accentSoft/40" : "")}
      >
        {cards.length === 0 && (
          <div className="text-center text-[12px] text-mutedSoft py-6">
            No matching opportunities
          </div>
        )}
        {cards.map((c) => (
          <KanbanCard key={c.id} card={c} />
        ))}
      </div>
    </div>
  );
}

function KanbanCard({ card }: { card: Card }) {
  const { setNodeRef, attributes, listeners, transform, isDragging } = useDraggable({
    id: `card:${card.id}`,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 40 }
    : undefined;
  const logoColor = pickLogoColor(card.name);
  const letter = (card.name.trim()[0] ?? "?").toUpperCase();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={"opp-card group " + (isDragging ? "opacity-60" : "")}
    >
      <div className="actions">
        <button className="size-6 grid place-items-center rounded hover:bg-surface text-muted">
          <Pencil size={12} />
        </button>
        <button className="size-6 grid place-items-center rounded hover:bg-surface text-muted">
          <Trash2 size={12} />
        </button>
        <button className="size-6 grid place-items-center rounded hover:bg-surface text-muted">
          <Headphones size={12} />
        </button>
      </div>

      <div className="title-row pr-14">
        <span className={`logo ${logoColor}`}>{letter}</span>
        <span className="truncate hover:underline">{card.name}</span>
      </div>

      <div className="meta-row">
        <div className="avatar">{card.ownerInitials ?? "–"}</div>
        <div className="value-col">
          <div className="value-amt truncate">
            {Number(card.value) > 0 ? formatMoney(card.value, card.currency) : ""}
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
    </div>
  );
}
