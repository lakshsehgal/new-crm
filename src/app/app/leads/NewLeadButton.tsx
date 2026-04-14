"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export default function NewLeadButton() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  async function submit(fd: FormData) {
    const body = Object.fromEntries(fd);
    const res = await fetch("/api/internal/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return toast.error("Failed to create");
    toast.success("Lead created");
    setOpen(false);
    start(() => router.refresh());
  }

  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={14} />New lead</button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/30 grid place-items-center" onClick={() => setOpen(false)}>
          <div className="card p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold">New lead</h2>
            <form className="space-y-3 mt-3" action={(fd) => start(() => submit(fd))}>
              <label className="block"><span className="label">Title</span><input name="title" className="input mt-1" required /></label>
              <label className="block"><span className="label">Source</span><input name="source" className="input mt-1" /></label>
              <label className="block"><span className="label">Value</span><input name="value" className="input mt-1" type="number" step="0.01" /></label>
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
                <button className="btn-primary" disabled={pending}>{pending ? "Creating…" : "Create"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
