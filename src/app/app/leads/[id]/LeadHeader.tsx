"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, MoreHorizontal, Pencil } from "lucide-react";

type Lead = {
  id: string;
  name: string;
  status: "POTENTIAL" | "QUALIFIED" | "CUSTOMER" | "BAD_FIT" | "CHURNED";
  opportunities: { id: string }[];
};

const STATUSES: Lead["status"][] = [
  "POTENTIAL",
  "QUALIFIED",
  "CUSTOMER",
  "BAD_FIT",
  "CHURNED",
];

const statusStyle: Record<string, string> = {
  POTENTIAL: "bg-amber-50 text-amber-700 border-amber-200",
  QUALIFIED: "bg-blue-50 text-blue-700 border-blue-200",
  CUSTOMER: "bg-emerald-50 text-emerald-700 border-emerald-200",
  BAD_FIT: "bg-rose-50 text-rose-700 border-rose-200",
  CHURNED: "bg-gray-100 text-gray-600 border-gray-200",
};

export default function LeadHeader({ lead }: { lead: Lead }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(lead.status);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(lead.name);
  const [pending, start] = useTransition();
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingName) nameRef.current?.select();
  }, [editingName]);

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === lead.name) {
      setName(lead.name);
      setEditingName(false);
      return;
    }
    setEditingName(false);
    const res = await fetch(`/api/internal/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (!res.ok) {
      toast.error("Failed to rename lead");
      setName(lead.name);
    } else {
      toast.success("Lead renamed");
      start(() => router.refresh());
    }
  }

  async function setStatusValue(next: Lead["status"]) {
    setStatus(next);
    setOpen(false);
    const res = await fetch(`/api/internal/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) toast.error("Failed to update status");
    else start(() => router.refresh());
  }

  const initials = name.trim()[0]?.toUpperCase() ?? "?";

  return (
    <div className="h-16 border-b border-border px-5 flex items-center gap-3 bg-white flex-shrink-0">
      <div className="size-8 rounded-md bg-accentSoft text-accent grid place-items-center font-semibold text-sm">
        {initials}
      </div>
      <div>
        <div className="flex items-center gap-2 group/name">
          {editingName ? (
            <input
              ref={nameRef}
              className="font-semibold text-lg bg-transparent border-b-2 border-accent outline-none py-0 px-0.5 -ml-0.5"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveName();
                if (e.key === "Escape") {
                  setName(lead.name);
                  setEditingName(false);
                }
              }}
            />
          ) : (
            <h1
              className="font-semibold text-lg cursor-pointer hover:text-accent"
              onClick={() => setEditingName(true)}
              title="Click to rename"
            >
              {name}
            </h1>
          )}
          {!editingName && (
            <button
              className="text-muted hover:text-ink opacity-0 group-hover/name:opacity-100 transition-opacity"
              onClick={() => setEditingName(true)}
              title="Rename lead"
            >
              <Pencil size={13} />
            </button>
          )}
          <span className="badge text-[10.5px] px-1.5 !py-0">
            {lead.opportunities.length}
          </span>
        </div>
        <div className="relative mt-0.5">
          <button
            className={`badge ${statusStyle[status]} cursor-pointer pr-2`}
            onClick={() => setOpen((o) => !o)}
            disabled={pending}
          >
            {status.replace("_", " ")} <ChevronDown size={12} />
          </button>
          {open && (
            <div className="absolute top-full left-0 mt-1 card shadow-pop z-30 py-1 min-w-[160px] pop-in">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusValue(s)}
                  className="w-full text-left text-sm px-3 py-1.5 hover:bg-surface"
                >
                  {s.replace("_", " ")}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <button className="btn-ghost ml-2">
        <MoreHorizontal size={16} />
      </button>
    </div>
  );
}
