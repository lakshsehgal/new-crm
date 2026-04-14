"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatMoney } from "@/lib/utils";

type Opp = {
  id: string;
  name: string;
  value: string;
  currency: string;
  stageId: string;
  expectedCloseAt: string | null;
};

type Stage = { id: string; name: string; isWon: boolean; isLost: boolean };

export default function OpportunityEditor({
  opp,
  stages,
}: {
  opp: Opp;
  stages: Stage[];
}) {
  const [data, setData] = useState(opp);
  const [saving, setSaving] = useState<string | null>(null);
  const [, start] = useTransition();
  const router = useRouter();

  async function save(patch: Partial<Opp>, key: string) {
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
      start(() => router.refresh());
    } finally {
      setSaving(null);
    }
  }

  async function remove() {
    if (!confirm("Delete this opportunity? This cannot be undone.")) return;
    const res = await fetch(`/api/internal/opportunities/${opp.id}`, {
      method: "DELETE",
    });
    if (!res.ok) return toast.error("Failed");
    toast.success("Opportunity deleted");
    router.push("/app/opportunities");
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Opportunity</h2>
        <button className="btn-ghost text-rose-500 hover:text-rose-700" onClick={remove}>
          Delete
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Name" saving={saving === "name"}>
          <input
            className="input"
            value={data.name}
            onChange={(e) => setData({ ...data, name: e.target.value })}
            onBlur={() => {
              if (data.name !== opp.name && data.name.trim()) {
                void save({ name: data.name }, "name");
              }
            }}
          />
        </Field>

        <Field label="Value" saving={saving === "value"} hint={formatMoney(data.value)}>
          <input
            type="number"
            step="0.01"
            className="input"
            value={data.value}
            onChange={(e) => setData({ ...data, value: e.target.value })}
            onBlur={() => {
              if (data.value !== opp.value) {
                void save({ value: data.value }, "value");
              }
            }}
          />
        </Field>

        <Field label="Stage" saving={saving === "stageId"}>
          <select
            className="input"
            value={data.stageId}
            onChange={(e) => {
              const v = e.target.value;
              setData({ ...data, stageId: v });
              void save({ stageId: v }, "stageId");
            }}
          >
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.isWon ? " · Won" : s.isLost ? " · Lost" : ""}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Expected close" saving={saving === "expectedCloseAt"}>
          <input
            type="date"
            className="input"
            value={data.expectedCloseAt ? data.expectedCloseAt.slice(0, 10) : ""}
            onChange={(e) => {
              const v = e.target.value ? new Date(e.target.value).toISOString() : null;
              setData({ ...data, expectedCloseAt: v });
              void save({ expectedCloseAt: v }, "expectedCloseAt");
            }}
          />
        </Field>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  saving,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  saving?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1">
        <span className="label">{label}</span>
        {saving ? (
          <span className="text-[10px] text-mutedSoft">saving…</span>
        ) : hint ? (
          <span className="text-[11px] text-muted">{hint}</span>
        ) : null}
      </div>
      {children}
    </label>
  );
}
