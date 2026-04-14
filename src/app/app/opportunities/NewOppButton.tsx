"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export default function NewOppButton({
  pipelineId,
  stages,
}: {
  pipelineId: string;
  stages: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  async function submit(fd: FormData): Promise<void> {
    const body = Object.fromEntries(fd);
    const res = await fetch("/api/internal/opportunities", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, pipelineId }),
    });
    if (!res.ok) {
      toast.error("Failed to create");
      return;
    }
    toast.success("Opportunity created");
    setOpen(false);
    start(() => router.refresh());
  }

  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={14} />New opportunity</button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/30 grid place-items-center" onClick={() => setOpen(false)}>
          <div className="card p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold">New opportunity</h2>
            <form className="space-y-3 mt-3" action={(fd) => start(() => submit(fd))}>
              <label className="block"><span className="label">Name</span><input name="name" className="input mt-1" required /></label>
              <label className="block"><span className="label">Value</span><input name="value" className="input mt-1" type="number" step="0.01" defaultValue="0" /></label>
              <label className="block">
                <span className="label">Stage</span>
                <select name="stageId" className="input mt-1">
                  {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
              <div className="flex justify-end gap-2">
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
