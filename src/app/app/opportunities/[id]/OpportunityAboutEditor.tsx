"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Trophy,
  DollarSign,
  Target,
  Calendar,
  User,
  Tag,
} from "lucide-react";
import { formatMoney } from "@/lib/utils";

type Stage = { id: string; name: string; isWon: boolean; isLost: boolean };

type OppForEdit = {
  id: string;
  name: string;
  value: string;
  stageId: string;
  expectedCloseAt: string | null;
  ownerEmail: string | null;
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

  async function save(patch: Partial<OppForEdit> & Record<string, any>, key: string) {
    setSaving(key);
    try {
      const body: any = {};
      if ("name" in patch) body.name = patch.name;
      if ("value" in patch) body.value = patch.value;
      if ("stageId" in patch) body.stageId = patch.stageId;
      if ("expectedCloseAt" in patch) body.expectedCloseAt = patch.expectedCloseAt;
      const res = await fetch(`/api/internal/opportunities/${opp.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
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
  const commit = () => {
    setEditing(false);
    if (local !== value) onCommit(local);
  };
  if (!editing) {
    return (
      <button
        className="group flex items-center gap-2.5 w-full text-left px-3 py-2 hover:bg-surface/70 rounded transition-colors"
        onClick={() => {
          setLocal(value);
          setEditing(true);
        }}
      >
        {icon && <span className="text-mutedSoft flex-shrink-0">{icon}</span>}
        <span className="flex-1 text-[13px]">{value || <span className="text-mutedSoft">Add {label.toLowerCase()}…</span>}</span>
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
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
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
  const commit = () => {
    setEditing(false);
    if (local !== value) onCommit(local);
  };
  if (!editing) {
    return (
      <button
        className="group flex items-center gap-2.5 w-full text-left px-3 py-2 hover:bg-surface/70 rounded transition-colors"
        onClick={() => {
          setLocal(value);
          setEditing(true);
        }}
      >
        {icon && <span className="text-mutedSoft flex-shrink-0">{icon}</span>}
        <span className="flex-1 text-[13px]">
          {display ?? <span className="text-mutedSoft">Add {label.toLowerCase()}…</span>}
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
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
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
