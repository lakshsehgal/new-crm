"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Upload, Sparkles, X } from "lucide-react";

type Props = {
  /** Button label override */
  label?: string;
  /** Button visual variant */
  variant?: "primary" | "icon";
};

export default function NewLeadButton({ label = "New lead", variant = "primary" }: Props) {
  const [open, setOpen] = useState(false);
  const [company, setCompany] = useState("");
  const [contact, setContact] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  function reset() {
    setCompany("");
    setContact("");
  }

  async function create() {
    if (!company.trim()) {
      toast.error("Company name is required");
      return;
    }
    const res = await fetch("/api/internal/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        companyName: company.trim(),
        contactName: contact.trim() || undefined,
      }),
    });
    if (!res.ok) {
      toast.error("Failed to create lead");
      return;
    }
    toast.success("Lead created");
    setOpen(false);
    reset();
    start(() => router.refresh());
  }

  return (
    <>
      {variant === "icon" ? (
        <button
          className="size-8 rounded-md border border-border bg-white grid place-items-center text-muted hover:bg-surface"
          onClick={() => setOpen(true)}
          title="New lead"
        >
          <Plus size={14} />
        </button>
      ) : (
        <button className="btn-primary" onClick={() => setOpen(true)}>
          <Plus size={14} /> {label}
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="card w-full max-w-[640px] p-6 shadow-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">New Lead</h2>
              <button
                className="size-7 grid place-items-center rounded-md text-muted hover:bg-surface"
                onClick={() => setOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-5">
              <label className="block">
                <span className="label">Company Name</span>
                <input
                  className="input mt-1.5"
                  placeholder="e.g. Close"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  autoFocus
                />
              </label>
              <label className="block">
                <span className="label">Contact Name</span>
                <input
                  className="input mt-1.5"
                  placeholder="e.g. Steli Efti"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                />
              </label>
            </div>

            <div className="flex items-center gap-3 my-5">
              <div className="h-px bg-border flex-1" />
              <span className="text-xs text-mutedSoft uppercase tracking-wide">or</span>
              <div className="h-px bg-border flex-1" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface"
                onClick={() =>
                  toast("Bulk import is coming soon. Use the REST API for now.", {
                    description: "POST /api/v1/contacts with your API key.",
                  })
                }
              >
                <Upload size={14} /> Import leads & data
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface"
                onClick={() =>
                  toast("No duplicates detected.", {
                    description: "We'll suggest matches once you have contacts.",
                  })
                }
              >
                <Sparkles size={14} /> Review potential contacts
              </button>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button className="btn" onClick={() => setOpen(false)}>Cancel</button>
              <button
                className="btn-primary disabled:opacity-60"
                disabled={pending || !company.trim()}
                onClick={create}
              >
                {pending ? "Creating…" : "Create Lead"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
