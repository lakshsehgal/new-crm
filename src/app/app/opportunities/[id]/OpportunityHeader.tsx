"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronDown,
  MoreHorizontal,
  Trash2,
  Trophy,
  Building2,
} from "lucide-react";
import { formatMoney } from "@/lib/utils";

type Stage = { id: string; name: string; isWon: boolean; isLost: boolean };

export default function OpportunityHeader({
  oppId,
  oppName,
  leadId,
  leadName,
  value,
  stageId,
  stages,
}: {
  oppId: string;
  oppName: string;
  leadId: string;
  leadName: string;
  value: string;
  stageId: string;
  stages: Stage[];
}) {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [currentStageId, setCurrentStageId] = useState(stageId);
  const [pending, start] = useTransition();
  const router = useRouter();

  const stage = stages.find((s) => s.id === currentStageId);

  async function setStage(id: string) {
    setCurrentStageId(id);
    setOpen(false);
    const res = await fetch(`/api/internal/opportunities/${oppId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stageId: id }),
    });
    if (!res.ok) toast.error("Failed to change stage");
    else start(() => router.refresh());
  }

  async function remove() {
    if (!confirm("Delete this opportunity? This cannot be undone.")) return;
    const res = await fetch(`/api/internal/opportunities/${oppId}`, {
      method: "DELETE",
    });
    if (!res.ok) return toast.error("Failed");
    toast.success("Deleted");
    router.push(`/app/leads/${leadId}`);
  }

  const stageClass = stage?.isWon
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : stage?.isLost
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <div className="h-16 border-b border-border px-5 flex items-center gap-3 bg-white flex-shrink-0">
      <Link
        href={`/app/leads/${leadId}`}
        className="size-7 grid place-items-center rounded-md text-muted hover:bg-surface hover:text-ink"
        title="Back to lead"
      >
        <ArrowLeft size={16} />
      </Link>
      <div className="size-9 rounded-md bg-amber-50 text-amber-600 grid place-items-center">
        <Trophy size={16} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="font-semibold text-[17px] truncate">{oppName}</h1>
          <div className="relative">
            <button
              className={`badge cursor-pointer pr-2 ${stageClass}`}
              onClick={() => setOpen((o) => !o)}
              disabled={pending}
            >
              {stage?.name ?? "—"} <ChevronDown size={12} />
            </button>
            {open && (
              <div className="absolute top-full left-0 mt-1 card shadow-pop z-30 py-1 min-w-[180px] pop-in">
                {stages.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStage(s.id)}
                    className="w-full text-left text-sm px-3 py-1.5 hover:bg-surface"
                  >
                    {s.name}
                    {s.isWon ? " · Won" : s.isLost ? " · Lost" : ""}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <Link
          href={`/app/leads/${leadId}`}
          className="text-[12px] text-muted hover:underline flex items-center gap-1 mt-0.5"
        >
          <Building2 size={11} /> {leadName}
        </Link>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="text-[20px] font-semibold">
          {formatMoney(value)}
        </div>
        <div className="relative">
          <button
            className="btn-ghost"
            onClick={() => setMenu((o) => !o)}
            title="More"
          >
            <MoreHorizontal size={16} />
          </button>
          {menu && (
            <div className="absolute top-full right-0 mt-1 card shadow-pop z-30 py-1 min-w-[160px] pop-in">
              <button
                onClick={() => {
                  setMenu(false);
                  void remove();
                }}
                className="w-full text-left text-sm px-3 py-1.5 hover:bg-surface text-rose-600 flex items-center gap-2"
              >
                <Trash2 size={13} /> Delete opportunity
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
