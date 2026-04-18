"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

type Props = {
  label?: string;
};

export default function NewLeadButton({ label = "New lead" }: Props) {
  const [open, setOpen] = useState(false);
  const [company, setCompany] = useState("");
  const [contact, setContact] = useState("");
  const [saving, setSaving] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function reset() {
    setCompany("");
    setContact("");
  }

  async function create() {
    if (saving) return;
    if (!company.trim()) {
      toast.error("Company name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/internal/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: company.trim(),
          contactName: contact.trim() || undefined,
        }),
      });
      if (!res.ok) {
        toast.error("Failed to create lead");
        return;
      }
      const j = (await res.json()) as { lead: { id: string } };
      toast.success("Lead created");
      setOpen(false);
      reset();
      router.push(`/app/leads/${j.lead.id}`);
      start(() => router.refresh());
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}>
        <Plus size={14} /> {label}
      </button>

      {open && (
        <div
          className="modal-overlay"
          onClick={() => setOpen(false)}
        >
          <div
            className="modal-card w-full max-w-[560px] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">New lead</h2>
              <button
                className="size-7 grid place-items-center rounded-md text-muted hover:bg-surface"
                onClick={() => setOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-[13px] text-muted mt-1">
              A lead represents a company. You can add more contacts and opportunities to it later.
            </p>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <label className="block">
                <span className="label">Company name</span>
                <input
                  className="input mt-1.5"
                  placeholder="e.g. Close"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") create();
                  }}
                  autoFocus
                />
              </label>
              <label className="block">
                <span className="label">Primary contact (optional)</span>
                <input
                  className="input mt-1.5"
                  placeholder="e.g. Steli Efti"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") create();
                  }}
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button className="btn" onClick={() => setOpen(false)}>Cancel</button>
              <button
                className="btn-primary disabled:opacity-60"
                disabled={saving || !company.trim()}
                onClick={create}
              >
                {saving ? "Creating…" : "Create lead"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
