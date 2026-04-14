"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

export default function AddContactButton({ leadId }: { leadId: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", title: "" });
  const [pending, start] = useTransition();
  const router = useRouter();

  async function save() {
    const res = await fetch(`/api/internal/leads/${leadId}/contacts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) return toast.error("Failed");
    toast.success("Contact added");
    setOpen(false);
    setForm({ firstName: "", lastName: "", email: "", phone: "", title: "" });
    start(() => router.refresh());
  }

  return (
    <>
      <button
        className="size-5 grid place-items-center rounded hover:bg-surface text-muted"
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
        title="Add contact"
      >
        <Plus size={12} />
      </button>
      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal-card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Add contact</h2>
              <button className="size-7 grid place-items-center text-muted hover:bg-surface rounded" onClick={() => setOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <label className="block"><span className="label">First name</span>
                <input className="input mt-1" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </label>
              <label className="block"><span className="label">Last name</span>
                <input className="input mt-1" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </label>
              <label className="block col-span-2"><span className="label">Email</span>
                <input type="email" className="input mt-1" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </label>
              <label className="block"><span className="label">Phone</span>
                <input className="input mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </label>
              <label className="block"><span className="label">Title</span>
                <input className="input mt-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="btn" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={save} disabled={pending}>
                {pending ? "Saving…" : "Add contact"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
