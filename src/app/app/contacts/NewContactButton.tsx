"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export default function NewContactButton() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  async function onSubmit(form: FormData): Promise<void> {
    const body = Object.fromEntries(form) as Record<string, string>;
    const res = await fetch("/api/internal/contacts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      toast.error("Failed to create contact");
      return;
    }
    toast.success("Contact created");
    setOpen(false);
    start(() => router.refresh());
  }

  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}>
        <Plus size={14} /> New contact
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/30 grid place-items-center" onClick={() => setOpen(false)}>
          <div
            className="card p-5 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-semibold">New contact</h2>
            <form
              className="grid grid-cols-2 gap-3 mt-3"
              action={(fd) => start(() => onSubmit(fd))}
            >
              <label className="block"><span className="label">First name</span><input className="input mt-1" name="firstName" /></label>
              <label className="block"><span className="label">Last name</span><input className="input mt-1" name="lastName" /></label>
              <label className="block col-span-2"><span className="label">Email</span><input className="input mt-1" name="email" type="email" /></label>
              <label className="block"><span className="label">Phone</span><input className="input mt-1" name="phone" /></label>
              <label className="block"><span className="label">Company</span><input className="input mt-1" name="company" /></label>
              <label className="block col-span-2"><span className="label">Title</span><input className="input mt-1" name="title" /></label>
              <div className="col-span-2 flex justify-end gap-2 mt-2">
                <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={pending}>
                  {pending ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
