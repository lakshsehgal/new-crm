"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type CustomField = {
  id: string;
  key: string;
  label: string;
  type: "TEXT" | "NUMBER" | "DATE" | "BOOLEAN" | "SELECT" | "URL";
  options?: Array<{ label: string; value: string }> | null;
};

type Contact = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
  notes: string | null;
  customData: Record<string, any>;
};

export default function ContactEditor({
  contact,
  customFields,
}: {
  contact: Contact;
  customFields: CustomField[];
}) {
  const [form, setForm] = useState(contact);
  const [pending, start] = useTransition();
  const router = useRouter();

  const dirty = JSON.stringify(form) !== JSON.stringify(contact);

  async function save() {
    const res = await fetch(`/api/internal/contacts/${contact.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      toast.error("Failed to save");
      return;
    }
    toast.success("Saved");
    start(() => router.refresh());
  }

  return (
    <section className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Profile</h2>
        <button className="btn-primary" disabled={!dirty || pending} onClick={save}>
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} />
        <Field label="Last name" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} />
        <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <Field label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
      </div>

      {customFields.length > 0 && (
        <div>
          <div className="label mb-2">Custom fields</div>
          <div className="grid grid-cols-2 gap-3">
            {customFields.map((f) => (
              <CustomFieldInput
                key={f.id}
                field={f}
                value={form.customData?.[f.key]}
                onChange={(v) =>
                  setForm({
                    ...form,
                    customData: { ...(form.customData ?? {}), [f.key]: v },
                  })
                }
              />
            ))}
          </div>
        </div>
      )}

      <label className="block">
        <span className="label">Notes</span>
        <textarea
          className="input mt-1 min-h-[120px]"
          value={form.notes ?? ""}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </label>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string | null;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        type={type}
        className="input mt-1"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function CustomFieldInput({
  field,
  value,
  onChange,
}: {
  field: CustomField;
  value: any;
  onChange: (v: any) => void;
}) {
  const common = "input mt-1";
  const label = <span className="label">{field.label}</span>;
  switch (field.type) {
    case "NUMBER":
      return (
        <label className="block">{label}
          <input type="number" className={common} value={value ?? ""} onChange={(e) => onChange(e.target.valueAsNumber)} />
        </label>
      );
    case "DATE":
      return (
        <label className="block">{label}
          <input type="date" className={common} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
        </label>
      );
    case "BOOLEAN":
      return (
        <label className="flex items-center gap-2 mt-5">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
          <span>{field.label}</span>
        </label>
      );
    case "SELECT":
      return (
        <label className="block">{label}
          <select className={common} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
            <option value="">—</option>
            {(field.options ?? []).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      );
    case "URL":
      return (
        <label className="block">{label}
          <input type="url" className={common} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
        </label>
      );
    default:
      return (
        <label className="block">{label}
          <input className={common} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
        </label>
      );
  }
}
