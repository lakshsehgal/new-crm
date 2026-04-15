"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Trophy,
  DollarSign,
  Target,
  Calendar,
  User,
  Receipt,
  ListTodo,
  X,
  Check,
} from "lucide-react";
import { formatMoney } from "@/lib/utils";

type Stage = { id: string; name: string; isWon: boolean; isLost: boolean };

export const SOW_OPTIONS = [
  "Meta Ads",
  "Google Ads",
  "UGCs",
  "Reel & Concept Creatives",
  "Post-Production",
  "Statics",
  "CRO",
  "Social Media Management",
] as const;

type OppForEdit = {
  id: string;
  name: string;
  value: string;
  stageId: string;
  expectedCloseAt: string | null;
  ownerEmail: string | null;
  finalQuote: string | null;
  sow: string[];
};

export default function OpportunityAboutEditor({
  opp,
  stages,
}: {
  opp: OppForEdit;
  stages: Stage[];
}) {
  const [data, setData] = useState(opp);
  const [saving, setSaving] = useState<string | null>(null);
  const router = useRouter();

  const stage = stages.find((s) => s.id === data.stageId);

  async function save(patch: Partial<OppForEdit>, key: string) {
    setSaving(key);
    try {
      const res = await fetch(`/api/internal/opportunities/${opp.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        toast.error("Failed to save");
        return;
      }
      router.refresh();
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="py-1">
      <InlineText
        icon={<Trophy size={13} />}
        label="Name"
        value={data.name}
        saving={saving === "name"}
        onCommit={(v) => {
          if (!v.trim()) return;
          setData({ ...data, name: v });
          void save({ name: v }, "name");
        }}
      />
      <InlineNumber
        icon={<DollarSign size={13} />}
        label="Value"
        value={data.value}
        saving={saving === "value"}
        display={Number(data.value) > 0 ? formatMoney(data.value) : undefined}
        onCommit={(v) => {
          setData({ ...data, value: v });
          void save({ value: v }, "value");
        }}
      />
      <InlineSelect
        icon={<Target size={13} />}
        label="Stage"
        value={data.stageId}
        displayValue={stage?.name}
        saving={saving === "stageId"}
        options={stages.map((s) => ({
          value: s.id,
          label: s.isWon ? `${s.name} · Won` : s.isLost ? `${s.name} · Lost` : s.name,
        }))}
        onCommit={(v) => {
          setData({ ...data, stageId: v });
          void save({ stageId: v }, "stageId");
        }}
      />
      <InlineDate
        icon={<Calendar size={13} />}
        label="Expected close"
        value={data.expectedCloseAt}
        saving={saving === "expectedCloseAt"}
        onCommit={(v) => {
          const iso = v ? new Date(v).toISOString() : null;
          setData({ ...data, expectedCloseAt: iso });
          void save({ expectedCloseAt: iso }, "expectedCloseAt");
        }}
      />
      <InlineText
        icon={<Receipt size={13} />}
        label="Final quote"
        value={data.finalQuote ?? ""}
        saving={saving === "finalQuote"}
        onCommit={(v) => {
          setData({ ...data, finalQuote: v });
          void save({ finalQuote: v || null }, "finalQuote");
        }}
      />
      <SowMultiSelect
        value={data.sow}
        saving={saving === "sow"}
        onCommit={(v) => {
          setData({ ...data, sow: v });
          void save({ sow: v }, "sow");
        }}
      />
      {data.ownerEmail && (
        <div className="flex items-center gap-2.5 px-3 py-2">
          <span className="text-mutedSoft flex-shrink-0"><User size={13} /></span>
          <span className="flex-1 text-[13px] break-all">{data.ownerEmail}</span>
        </div>
      )}
    </div>
  );
}

function InlineText({
  label,
  icon,
  value,
  saving,
  onCommit,
}: {
  label: string;
  icon?: React.ReactNode;
  value: string;
  saving: boolean;
  onCommit: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value ?? "");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => setLocal(value ?? ""), [value]);

  function debounced(v: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (v !== value) onCommit(v);
    }, 600);
  }

  const commitNow = () => {
    setEditing(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (local !== value) onCommit(local);
  };

  if (!editing) {
    return (
      <button
        className="group flex items-center gap-2.5 w-full text-left px-3 py-2 hover:bg-surface/70 rounded transition-colors"
        onClick={() => {
          setLocal(value ?? "");
          setEditing(true);
        }}
      >
        {icon && <span className="text-mutedSoft flex-shrink-0">{icon}</span>}
        <span className="flex-1 text-[13px]">
          {value || (
            <span className="text-mutedSoft">Add {label.toLowerCase()}…</span>
          )}
        </span>
        {saving && <span className="text-[10px] text-mutedSoft">saving…</span>}
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2.5 px-3 py-2">
      {icon && <span className="text-mutedSoft flex-shrink-0">{icon}</span>}
      <input
        autoFocus
        className="input flex-1"
        value={local}
        onChange={(e) => {
          setLocal(e.target.value);
          debounced(e.target.value);
        }}
        onBlur={commitNow}
        onKeyDown={(e) => {
          if (e.key === "Enter") commitNow();
          if (e.key === "Escape") setEditing(false);
        }}
      />
    </div>
  );
}

function InlineNumber({
  label,
  icon,
  value,
  display,
  saving,
  onCommit,
}: {
  label: string;
  icon?: React.ReactNode;
  value: string;
  display?: string;
  saving: boolean;
  onCommit: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value ?? "");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => setLocal(value ?? ""), [value]);

  function debounced(v: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (v !== value) onCommit(v);
    }, 600);
  }
  const commitNow = () => {
    setEditing(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (local !== value) onCommit(local);
  };

  if (!editing) {
    return (
      <button
        className="group flex items-center gap-2.5 w-full text-left px-3 py-2 hover:bg-surface/70 rounded transition-colors"
        onClick={() => {
          setLocal(value ?? "");
          setEditing(true);
        }}
      >
        {icon && <span className="text-mutedSoft flex-shrink-0">{icon}</span>}
        <span className="flex-1 text-[13px]">
          {display ?? (
            <span className="text-mutedSoft">Add {label.toLowerCase()}…</span>
          )}
        </span>
        {saving && <span className="text-[10px] text-mutedSoft">saving…</span>}
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2.5 px-3 py-2">
      {icon && <span className="text-mutedSoft flex-shrink-0">{icon}</span>}
      <input
        autoFocus
        type="number"
        step="0.01"
        className="input flex-1"
        value={local}
        onChange={(e) => {
          setLocal(e.target.value);
          debounced(e.target.value);
        }}
        onBlur={commitNow}
        onKeyDown={(e) => {
          if (e.key === "Enter") commitNow();
          if (e.key === "Escape") setEditing(false);
        }}
      />
    </div>
  );
}

function InlineSelect({
  label,
  icon,
  value,
  displayValue,
  options,
  saving,
  onCommit,
}: {
  label: string;
  icon?: React.ReactNode;
  value: string;
  displayValue?: string;
  options: { value: string; label: string }[];
  saving: boolean;
  onCommit: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2">
      {icon && <span className="text-mutedSoft flex-shrink-0">{icon}</span>}
      <select
        className="input flex-1"
        value={value}
        onChange={(e) => onCommit(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {saving && <span className="text-[10px] text-mutedSoft">saving…</span>}
    </div>
  );
}

function InlineDate({
  label,
  icon,
  value,
  saving,
  onCommit,
}: {
  label: string;
  icon?: React.ReactNode;
  value: string | null;
  saving: boolean;
  onCommit: (v: string | null) => void;
}) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2">
      {icon && <span className="text-mutedSoft flex-shrink-0">{icon}</span>}
      <input
        type="date"
        className="input flex-1"
        value={value ? value.slice(0, 10) : ""}
        onChange={(e) => onCommit(e.target.value || null)}
      />
      {saving && <span className="text-[10px] text-mutedSoft">saving…</span>}
    </div>
  );
}

function SowMultiSelect({
  value,
  saving,
  onCommit,
}: {
  value: string[];
  saving: boolean;
  onCommit: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  function toggle(opt: string) {
    const next = value.includes(opt)
      ? value.filter((x) => x !== opt)
      : [...value, opt];
    onCommit(next);
  }

  return (
    <>
      <div className="px-3 py-2">
        <div className="flex items-center gap-2.5">
          <span className="text-mutedSoft flex-shrink-0">
            <ListTodo size={13} />
          </span>
          <button
            className="flex-1 text-left text-[13px] flex items-center gap-1 flex-wrap min-h-[24px] hover:bg-surface/70 rounded px-1 py-0.5 -ml-1 transition-colors"
            onClick={() => setOpen(true)}
          >
            {value.length === 0 ? (
              <span className="text-mutedSoft">Pick SOW…</span>
            ) : (
              value.map((v) => (
                <span
                  key={v}
                  className="badge bg-accentSoft text-accent border-accent/30"
                >
                  {v}
                </span>
              ))
            )}
          </button>
          {saving && <span className="text-[10px] text-mutedSoft">saving…</span>}
        </div>
        <div className="text-[10.5px] uppercase tracking-wide text-mutedSoft pl-6 mt-1">
          SOW
        </div>
      </div>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div
            className="modal-card w-full max-w-md p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <ListTodo size={16} className="text-mutedSoft" />
                Statement of Work
              </h2>
              <button
                className="size-7 grid place-items-center rounded text-muted hover:bg-surface"
                onClick={() => setOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-[12px] text-muted mt-1">
              Pick everything that's part of this engagement. Selections save
              instantly.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-1">
              {SOW_OPTIONS.map((opt) => {
                const active = value.includes(opt);
                return (
                  <button
                    key={opt}
                    onClick={() => toggle(opt)}
                    className={
                      "w-full text-left text-sm px-3 py-2 rounded flex items-center gap-2 " +
                      (active
                        ? "bg-accentSoft"
                        : "hover:bg-surface")
                    }
                  >
                    <span
                      className={
                        "size-4 rounded border grid place-items-center flex-shrink-0 " +
                        (active
                          ? "bg-accent border-accent text-white"
                          : "border-border")
                      }
                    >
                      {active && <Check size={10} />}
                    </span>
                    <span className={"flex-1 " + (active ? "font-medium" : "")}>
                      {opt}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-between text-[12px] text-muted">
              <span>{value.length} selected</span>
              <button className="btn-primary" onClick={() => setOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
