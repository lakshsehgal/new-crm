"use client";

import { useEffect, useRef, useState } from "react";
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
  const router = useRouter();

  async function save(key: string, value: any) {
    setSavingKey(key);
    try {
      const next = { ...data, [key]: value };
      const res = await fetch(API_PATH[entityKind](entityId), {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ customData: next }),
      });
      if (!res.ok) {
        toast.error("Failed to save");
      } else {
        router.refresh();
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
              onChange={(v) =>
                setData((prev) => ({ ...prev, [f.key]: v }))
              }
              onCommit={(v) => {
                setData((prev) => ({ ...prev, [f.key]: v }));
                void save(f.key, v);
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

/**
 * Renders the right input for the field type. Text/URL/number debounce auto-save
 * 600ms after the last change, plus an immediate commit on blur. Date/select/
 * boolean commit on every change.
 */
function FieldInput({
  field,
  value,
  onChange,
  onCommit,
}: {
  field: CustomFieldDef;
  value: any;
  onChange: (v: any) => void;
  onCommit: (v: any) => void;
}) {
  const [local, setLocal] = useState<any>(value ?? "");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync external value updates (e.g. after router.refresh)
  useEffect(() => {
    setLocal(value ?? "");
  }, [value]);

  function debouncedCommit(v: any, ms = 600) {
    onChange(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onCommit(v), ms);
  }

  function commitNow(v: any) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onCommit(v);
  }

  const placeholder = `Add ${field.label.toLowerCase()}…`;

  switch (field.type) {
    case "NUMBER":
      return (
        <input
          type="number"
          className="input !px-2 !py-1"
          placeholder={placeholder}
          value={local ?? ""}
          onChange={(e) => {
            const v = e.target.value === "" ? null : Number(e.target.value);
            setLocal(e.target.value);
            debouncedCommit(v);
          }}
          onBlur={(e) => {
            const v = e.target.value === "" ? null : Number(e.target.value);
            commitNow(v);
          }}
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
            commitNow(e.target.value || null);
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
              commitNow(e.target.checked);
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
            commitNow(e.target.value || null);
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
          onChange={(e) => {
            setLocal(e.target.value);
            debouncedCommit(e.target.value);
          }}
          onBlur={(e) => commitNow(e.target.value === "" ? null : e.target.value)}
        />
      );
    default:
      return (
        <input
          className="input !px-2 !py-1"
          placeholder={placeholder}
          value={local ?? ""}
          onChange={(e) => {
            setLocal(e.target.value);
            debouncedCommit(e.target.value);
          }}
          onBlur={(e) => commitNow(e.target.value === "" ? null : e.target.value)}
        />
      );
  }
}
