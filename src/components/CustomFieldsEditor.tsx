"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type FieldType = "TEXT" | "NUMBER" | "DATE" | "BOOLEAN" | "SELECT" | "URL";

export type CustomFieldDef = {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: Array<{ label: string; value: string }> | null;
};

type EntityKind = "lead" | "contact" | "opportunity";

const API_PATH: Record<EntityKind, (id: string) => string> = {
  lead: (id) => `/api/internal/leads/${id}`,
  contact: (id) => `/api/internal/contacts/${id}`,
  opportunity: (id) => `/api/internal/opportunities/${id}`,
};

/**
 * Inline list of workspace-wide custom fields for a record. Each row auto-saves
 * on blur. Values are merged into the record's customData JSON blob.
 */
export default function CustomFieldsEditor({
  entityKind,
  entityId,
  fields,
  initialData,
}: {
  entityKind: EntityKind;
  entityId: string;
  fields: CustomFieldDef[];
  initialData: Record<string, any>;
}) {
  const [data, setData] = useState<Record<string, any>>(initialData ?? {});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [, start] = useTransition();
  const router = useRouter();

  async function save(key: string, value: any) {
    setSavingKey(key);
    try {
      const res = await fetch(API_PATH[entityKind](entityId), {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ customData: { ...data, [key]: value } }),
      });
      if (!res.ok) {
        toast.error("Failed to save");
      } else {
        start(() => router.refresh());
      }
    } finally {
      setSavingKey(null);
    }
  }

  if (fields.length === 0) {
    return (
      <div className="px-4 py-3 text-[13px] text-mutedSoft italic">
        No custom fields yet. Add some in Admin → Custom fields.
      </div>
    );
  }

  return (
    <div>
      {fields.map((f) => {
        const value = data[f.key];
        return (
          <div key={f.id} className="px-4 py-2 text-[13px]">
            <div className="text-[11px] uppercase tracking-wide text-mutedSoft mb-0.5 flex items-center gap-2">
              <span>{f.label}</span>
              {savingKey === f.key && (
                <span className="text-[10px] text-mutedSoft">saving…</span>
              )}
            </div>
            <FieldInput
              field={f}
              value={value}
              onCommit={(v) => {
                setData({ ...data, [f.key]: v });
                void save(f.key, v);
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

function FieldInput({
  field,
  value,
  onCommit,
}: {
  field: CustomFieldDef;
  value: any;
  onCommit: (v: any) => void;
}) {
  const [local, setLocal] = useState<any>(value ?? "");
  const placeholder = `Add ${field.label.toLowerCase()}…`;

  const commitOnBlur = () => {
    if (local !== value) onCommit(local === "" ? null : local);
  };

  switch (field.type) {
    case "NUMBER":
      return (
        <input
          type="number"
          className="input !px-2 !py-1"
          placeholder={placeholder}
          value={local ?? ""}
          onChange={(e) => setLocal(e.target.value === "" ? "" : Number(e.target.value))}
          onBlur={commitOnBlur}
        />
      );
    case "DATE":
      return (
        <input
          type="date"
          className="input !px-2 !py-1"
          value={local ?? ""}
          onChange={(e) => {
            setLocal(e.target.value);
            onCommit(e.target.value || null);
          }}
        />
      );
    case "BOOLEAN":
      return (
        <label className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            checked={!!local}
            onChange={(e) => {
              setLocal(e.target.checked);
              onCommit(e.target.checked);
            }}
          />
          <span>{field.label}</span>
        </label>
      );
    case "SELECT":
      return (
        <select
          className="input !px-2 !py-1"
          value={local ?? ""}
          onChange={(e) => {
            setLocal(e.target.value);
            onCommit(e.target.value || null);
          }}
        >
          <option value="">—</option>
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case "URL":
      return (
        <input
          type="url"
          className="input !px-2 !py-1"
          placeholder={placeholder}
          value={local ?? ""}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={commitOnBlur}
        />
      );
    default:
      return (
        <input
          className="input !px-2 !py-1"
          placeholder={placeholder}
          value={local ?? ""}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={commitOnBlur}
        />
      );
  }
}
