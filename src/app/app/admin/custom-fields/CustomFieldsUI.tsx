"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Check } from "lucide-react";

type FieldType = "TEXT" | "NUMBER" | "DATE" | "BOOLEAN" | "SELECT" | "URL";
type Scope = "LEAD" | "CONTACT" | "OPPORTUNITY";

type Field = {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options: Array<{ label: string; value: string }> | null;
  appliesTo: Scope[];
};

const TYPE_LABEL: Record<FieldType, string> = {
  TEXT: "Text",
  NUMBER: "Number",
  DATE: "Date",
  BOOLEAN: "Yes / No",
  SELECT: "Dropdown",
  URL: "URL",
};

const SCOPE_LABEL: Record<Scope, string> = {
  LEAD: "Leads",
  CONTACT: "Contacts",
  OPPORTUNITY: "Opportunities",
};

const ALL_SCOPES: Scope[] = ["LEAD", "CONTACT", "OPPORTUNITY"];

export default function CustomFieldsUI({ fields }: { fields: Field[] }) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<FieldType>("TEXT");
  const [appliesTo, setAppliesTo] = useState<Scope[]>([
    "LEAD",
    "OPPORTUNITY",
  ]);
  const [pending, start] = useTransition();
  const router = useRouter();

  function toggleScope(s: Scope) {
    setAppliesTo((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  async function create() {
    if (!label.trim()) {
      toast.error("Label is required");
      return;
    }
    if (appliesTo.length === 0) {
      toast.error("Pick at least one section");
      return;
    }
    const res = await fetch("/api/internal/admin/custom-fields", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label, type, appliesTo }),
    });
    if (!res.ok) return toast.error("Failed");
    toast.success("Field added");
    setLabel("");
    setType("TEXT");
    setAppliesTo(["LEAD", "OPPORTUNITY"]);
    start(() => router.refresh());
  }

  async function updateScope(id: string, scope: Scope, current: Scope[]) {
    const next = current.includes(scope)
      ? current.filter((x) => x !== scope)
      : [...current, scope];
    if (next.length === 0) {
      toast.error("Keep at least one section");
      return;
    }
    const res = await fetch(`/api/internal/admin/custom-fields/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ appliesTo: next }),
    });
    if (!res.ok) return toast.error("Failed");
    start(() => router.refresh());
  }

  async function remove(id: string) {
    if (
      !confirm(
        "Delete this field? Existing values on records will remain but the field will stop being shown.",
      )
    )
      return;
    const res = await fetch(`/api/internal/admin/custom-fields/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) return toast.error("Failed");
    toast.success("Removed");
    start(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-3">
        <div className="flex items-end gap-3 flex-wrap">
          <label className="flex-1 min-w-[220px]">
            <span className="label">Field name</span>
            <input
              className="input mt-1"
              placeholder="e.g. Current Revenue, Services Required"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") create();
              }}
            />
          </label>
          <label className="w-40">
            <span className="label">Type</span>
            <select
              className="input mt-1"
              value={type}
              onChange={(e) => setType(e.target.value as FieldType)}
            >
              {(Object.keys(TYPE_LABEL) as FieldType[]).map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
          <button className="btn-primary" onClick={create} disabled={pending}>
            <Plus size={14} /> Add field
          </button>
        </div>

        <div>
          <span className="label">Show on</span>
          <div className="flex items-center gap-2 mt-1.5">
            {ALL_SCOPES.map((s) => {
              const active = appliesTo.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleScope(s)}
                  className={
                    "pill " +
                    (active
                      ? "bg-accent text-white border-accent"
                      : "")
                  }
                >
                  {active && <Check size={11} />}
                  {SCOPE_LABEL[s]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="tbl">
          <thead>
            <tr>
              <th>Field</th>
              <th>Type</th>
              <th>Shown on</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => (
              <tr key={f.id}>
                <td className="font-medium">{f.label}</td>
                <td>{TYPE_LABEL[f.type]}</td>
                <td>
                  <div className="flex items-center gap-1 flex-wrap">
                    {ALL_SCOPES.map((s) => {
                      const on = f.appliesTo.includes(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => updateScope(f.id, s, f.appliesTo)}
                          className={
                            "badge cursor-pointer " +
                            (on
                              ? "bg-accentSoft text-accent border-accent/30"
                              : "text-mutedSoft")
                          }
                          title={
                            on
                              ? `Hide from ${SCOPE_LABEL[s]}`
                              : `Show on ${SCOPE_LABEL[s]}`
                          }
                        >
                          {on && <Check size={10} />}
                          {SCOPE_LABEL[s]}
                        </button>
                      );
                    })}
                  </div>
                </td>
                <td className="text-right">
                  <button
                    className="btn-ghost"
                    onClick={() => remove(f.id)}
                    title="Delete field"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {fields.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-muted py-10">
                  No custom fields yet. Add one above — the "Show on" toggles
                  let you pick whether it appears on Leads, Contacts or
                  Opportunities.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
