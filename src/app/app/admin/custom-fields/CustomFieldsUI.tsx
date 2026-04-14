"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

type FieldType = "TEXT" | "NUMBER" | "DATE" | "BOOLEAN" | "SELECT" | "URL";

type Field = {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options: Array<{ label: string; value: string }> | null;
};

const TYPE_LABEL: Record<FieldType, string> = {
  TEXT: "Text",
  NUMBER: "Number",
  DATE: "Date",
  BOOLEAN: "Yes / No",
  SELECT: "Dropdown",
  URL: "URL",
};

export default function CustomFieldsUI({ fields }: { fields: Field[] }) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<FieldType>("TEXT");
  const [pending, start] = useTransition();
  const router = useRouter();

  async function create() {
    if (!label.trim()) {
      toast.error("Label is required");
      return;
    }
    const res = await fetch("/api/internal/admin/custom-fields", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label, type }),
    });
    if (!res.ok) return toast.error("Failed");
    toast.success("Field added");
    setLabel("");
    setType("TEXT");
    start(() => router.refresh());
  }

  async function remove(id: string) {
    if (!confirm("Delete this field? Existing values on records will remain, but the field will stop being shown.")) return;
    const res = await fetch(`/api/internal/admin/custom-fields/${id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Failed");
    toast.success("Removed");
    start(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      <div className="card p-4 flex items-end gap-3 flex-wrap">
        <label className="flex-1 min-w-[220px]">
          <span className="label">Field name</span>
          <input
            className="input mt-1"
            placeholder="e.g. Website, Industry, Deal source"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") create();
            }}
          />
        </label>
        <label className="w-40">
          <span className="label">Type</span>
          <select className="input mt-1" value={type} onChange={(e) => setType(e.target.value as FieldType)}>
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

      <div className="card overflow-hidden">
        <table className="tbl">
          <thead>
            <tr>
              <th>Field</th>
              <th>Type</th>
              <th>Required</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => (
              <tr key={f.id}>
                <td className="font-medium">{f.label}</td>
                <td>{TYPE_LABEL[f.type]}</td>
                <td>{f.required ? "Yes" : "—"}</td>
                <td className="text-right">
                  <button className="btn-ghost" onClick={() => remove(f.id)} title="Delete field">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {fields.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-muted py-10">
                  No custom fields yet. Add one above — it'll show up on every Lead, Contact, and Opportunity.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
