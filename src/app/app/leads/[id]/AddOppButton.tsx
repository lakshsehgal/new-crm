"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

type Pipeline = { id: string; name: string; stages: { id: string; name: string }[] };

export default function AddOppButton({
  leadId,
  pipelines,
}: {
  leadId: string;
  pipelines: Pipeline[];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [pipelineId, setPipelineId] = useState(pipelines[0]?.id ?? "");
  const [stageId, setStageId] = useState(pipelines[0]?.stages[0]?.id ?? "");
  const [pending, start] = useTransition();
  const router = useRouter();

  const activePipeline = pipelines.find((p) => p.id === pipelineId);

  async function save() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    const res = await fetch(`/api/internal/leads/${leadId}/opportunities`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        value: value ? Number(value) : undefined,
        pipelineId,
        stageId,
      }),
    });
    if (!res.ok) return toast.error("Failed");
    toast.success("Opportunity created");
    setOpen(false);
    setName(""); setValue("");
    start(() => router.refresh());
  }

  if (pipelines.length === 0) {
    return (
      <button
        className="size-5 grid place-items-center rounded text-muted opacity-40"
        title="Create a pipeline first"
        disabled
      >
        <Plus size={12} />
      </button>
    );
  }

  return (
    <>
      <button
        className="size-5 grid place-items-center rounded hover:bg-surface text-muted"
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
        title="Add opportunity"
      >
        <Plus size={12} />
      </button>
      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal-card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Add opportunity</h2>
              <button className="size-7 grid place-items-center text-muted hover:bg-surface rounded" onClick={() => setOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3 mt-4">
              <label className="block"><span className="label">Name</span>
                <input className="input mt-1" placeholder="e.g. Annual contract" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
              </label>
              <label className="block"><span className="label">Value</span>
                <input type="number" step="0.01" className="input mt-1" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" />
              </label>
              <label className="block"><span className="label">Pipeline</span>
                <select className="input mt-1" value={pipelineId} onChange={(e) => {
                  setPipelineId(e.target.value);
                  const p = pipelines.find((pp) => pp.id === e.target.value);
                  setStageId(p?.stages[0]?.id ?? "");
                }}>
                  {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <label className="block"><span className="label">Starting stage</span>
                <select className="input mt-1" value={stageId} onChange={(e) => setStageId(e.target.value)}>
                  {activePipeline?.stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="btn" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={save} disabled={pending}>
                {pending ? "Saving…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
