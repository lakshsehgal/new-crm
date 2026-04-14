"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, MoreHorizontal } from "lucide-react";

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
  const [pending, start] = useTransition();
  const router = useRouter();

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

  const initials = lead.name.trim()[0]?.toUpperCase() ?? "?";

  return (
    <div className="h-16 border-b border-border px-5 flex items-center gap-3 bg-white flex-shrink-0">
      <div className="size-8 rounded-md bg-accentSoft text-accent grid place-items-center font-semibold text-sm">
        {initials}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-semibold text-lg">{lead.name}</h1>
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
            <div className="absolute top-full left-0 mt-1 card shadow-pop z-30 py-1 min-w-[160px]">
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
