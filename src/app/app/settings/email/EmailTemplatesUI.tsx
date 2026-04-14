"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, X } from "lucide-react";

type Template = {
  id: string;
  name: string;
  subject: string;
  body: string;
};

export default function EmailTemplatesUI({
  initialTemplates,
}: {
  initialTemplates: Template[];
}) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [editing, setEditing] = useState<Template | "new" | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  async function save(t: Omit<Template, "id"> & { id?: string }) {
    const method = t.id ? "PATCH" : "POST";
    const url = t.id
      ? `/api/internal/email-templates/${t.id}`
      : `/api/internal/email-templates`;
    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: t.name, subject: t.subject, body: t.body }),
    });
    if (!res.ok) return toast.error("Failed to save template");
    const saved = (await res.json()) as Template;
    setTemplates((prev) => {
      const i = prev.findIndex((x) => x.id === saved.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    setEditing(null);
    toast.success(t.id ? "Template updated" : "Template created");
    start(() => router.refresh());
  }

  async function remove(id: string) {
    if (!confirm("Delete this template?")) return;
    const res = await fetch(`/api/internal/email-templates/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) return toast.error("Failed");
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    toast.success("Deleted");
    start(() => router.refresh());
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setEditing("new")}>
          <Plus size={14} /> New template
        </button>
      </div>
      <div className="card overflow-hidden">
        {templates.length === 0 ? (
          <div className="text-center text-muted py-10 text-sm">
            No templates yet. Create one to reuse across outbound emails.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {templates.map((t) => (
              <li key={t.id} className="p-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{t.name}</div>
                  <div className="text-sm text-muted truncate">{t.subject}</div>
                  <div className="text-xs text-mutedSoft truncate mt-1">
                    {t.body.slice(0, 120)}
                    {t.body.length > 120 ? "…" : ""}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button className="btn" onClick={() => setEditing(t)}>
                    Edit
                  </button>
                  <button className="btn-ghost" onClick={() => remove(t.id)} disabled={pending}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && (
        <TemplateEditor
          initial={editing === "new" ? { name: "", subject: "", body: "" } : editing}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </div>
  );
}

function TemplateEditor({
  initial,
  onClose,
  onSave,
}: {
  initial: { id?: string; name: string; subject: string; body: string };
  onClose: () => void;
  onSave: (t: any) => Promise<void>;
}) {
  const [data, setData] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!data.name.trim() || !data.subject.trim() || !data.body.trim()) {
      toast.error("All fields are required");
      return;
    }
    setSaving(true);
    try {
      await onSave(data);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card w-full max-w-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">
            {data.id ? "Edit template" : "New template"}
          </h2>
          <button
            className="size-7 grid place-items-center rounded text-muted hover:bg-surface"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>
        <div className="space-y-3 mt-4">
          <label className="block">
            <span className="label">Name</span>
            <input
              className="input mt-1"
              placeholder="e.g. Cold outreach"
              value={data.name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="label">Subject</span>
            <input
              className="input mt-1"
              placeholder="Quick intro · {{company}}"
              value={data.subject}
              onChange={(e) => setData({ ...data, subject: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="label">Body</span>
            <textarea
              className="input mt-1 min-h-[220px] font-sans"
              placeholder={`Hi {{firstName}},\n\nI noticed {{company}} is doing great work in…`}
              value={data.body}
              onChange={(e) => setData({ ...data, body: e.target.value })}
            />
          </label>
          <p className="text-[12px] text-muted">
            Use <code>{"{{firstName}}"}</code>, <code>{"{{lastName}}"}</code>,{" "}
            <code>{"{{company}}"}</code>, <code>{"{{email}}"}</code>,{" "}
            <code>{"{{myName}}"}</code>.
          </p>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : data.id ? "Save changes" : "Create template"}
          </button>
        </div>
      </div>
    </div>
  );
}
