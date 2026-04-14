"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

type Field = {
  id: string;
  entity: "CONTACT" | "LEAD" | "OPPORTUNITY";
  key: string;
  label: string;
  type: "TEXT" | "NUMBER" | "DATE" | "BOOLEAN" | "SELECT" | "URL";
  required: boolean;
  options: Array<{ label: string; value: string }> | null;
};

export default function CustomFieldsUI({ fields }: { fields: Field[] }) {
  const [form, setForm] = useState<Partial<Field>>({
    entity: "CONTACT",
    type: "TEXT",
    required: false,
  });
  const [pending, start] = useTransition();
  const router = useRouter();

  async function create() {
    if (!form.label || !form.key) return toast.error("Key and label required");
    const res = await fetch("/api/internal/admin/custom-fields", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) return toast.error("Failed");
    toast.success("Field added");
    setForm({ entity: "CONTACT", type: "TEXT", required: false });
    start(() => router.refresh());
  }

  async function remove(id: string) {
    if (!confirm("Delete this field?")) return;
    const res = await fetch(`/api/internal/admin/custom-fields/${id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Failed");
    toast.success("Removed");
    start(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      <div className="card p-4 grid grid-cols-6 gap-3 items-end">
        <label className="block col-span-1"><span className="label">Entity</span>
          <select className="input mt-1" value={form.entity} onChange={(e) => setForm({ ...form, entity: e.target.value as any })}>
            <option value="CONTACT">Contact</option>
            <option value="LEAD">Lead</option>
            <option value="OPPORTUNITY">Opportunity</option>
          </select>
        </label>
        <label className="block col-span-1"><span className="label">Type</span>
          <select className="input mt-1" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })}>
            <option value="TEXT">Text</option>
            <option value="NUMBER">Number</option>
            <option value="DATE">Date</option>
            <option value="BOOLEAN">Boolean</option>
            <option value="SELECT">Select</option>
            <option value="URL">URL</option>
          </select>
        </label>
        <label className="block col-span-2"><span className="label">Label</span>
          <input className="input mt-1" value={form.label ?? ""} onChange={(e) => setForm({ ...form, label: e.target.value, key: form.key || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "_") })} />
        </label>
        <label className="block col-span-1"><span className="label">Key</span>
          <input className="input mt-1" value={form.key ?? ""} onChange={(e) => setForm({ ...form, key: e.target.value })} />
        </label>
        <button className="btn-primary col-span-1" onClick={create} disabled={pending}><Plus size={14} /> Add</button>
      </div>

      <div className="card overflow-hidden">
        <table className="tbl">
          <thead><tr><th>Entity</th><th>Label</th><th>Key</th><th>Type</th><th></th></tr></thead>
          <tbody>
            {fields.map((f) => (
              <tr key={f.id}>
                <td><span className="badge">{f.entity}</span></td>
                <td className="font-medium">{f.label}</td>
                <td><code>{f.key}</code></td>
                <td>{f.type}</td>
                <td className="text-right"><button className="btn-ghost" onClick={() => remove(f.id)}><Trash2 size={14}/></button></td>
              </tr>
            ))}
            {fields.length === 0 && <tr><td colSpan={5} className="text-center text-muted py-8">No custom fields yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
