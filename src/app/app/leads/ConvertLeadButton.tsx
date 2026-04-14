"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRightCircle, X } from "lucide-react";

type Pipeline = { id: string; name: string; stages: { id: string; name: string }[] };

export default function ConvertLeadButton({
  leadId,
  pipelines,
}: {
  leadId: string;
  pipelines: Pipeline[];
}) {
  const [open, setOpen] = useState(false);
  const [pipelineId, setPipelineId] = useState(pipelines[0]?.id ?? "");
  const [stageId, setStageId] = useState(pipelines[0]?.stages[0]?.id ?? "");
  const [value, setValue] = useState<string>("");
  const [pending, start] = useTransition();
  const router = useRouter();

  const activePipeline = pipelines.find((p) => p.id === pipelineId);

  async function convert() {
    const res = await fetch(`/api/internal/leads/${leadId}/convert`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        pipelineId,
        stageId,
        value: value ? Number(value) : undefined,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(j.error ?? "Failed to convert");
      return;
    }
    toast.success("Lead converted to opportunity");
    setOpen(false);
    start(() => router.refresh());
  }

  if (pipelines.length === 0) {
    return (
      <button className="btn-ghost" disabled title="No pipelines configured">
        Convert
      </button>
    );
  }

  return (
    <>
      <button
        className="btn-ghost text-accent"
        onClick={() => setOpen(true)}
        title="Convert to opportunity"
      >
        <ArrowRightCircle size={14} /> Convert
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="card w-full max-w-md p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Convert to Opportunity</h2>
              <button
                className="size-7 grid place-items-center rounded-md text-muted hover:bg-surface"
                onClick={() => setOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-muted mt-1">
              The lead will be replaced by an opportunity in your selected pipeline.
              The contact stays attached.
            </p>

            <div className="space-y-3 mt-4">
              <label className="block">
                <span className="label">Pipeline</span>
                <select
                  className="input mt-1"
                  value={pipelineId}
                  onChange={(e) => {
                    setPipelineId(e.target.value);
                    const p = pipelines.find((pp) => pp.id === e.target.value);
                    setStageId(p?.stages[0]?.id ?? "");
                  }}
                >
                  {pipelines.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label">Starting stage</span>
                <select
                  className="input mt-1"
                  value={stageId}
                  onChange={(e) => setStageId(e.target.value)}
                >
                  {activePipeline?.stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label">Value (optional)</span>
                <input
                  type="number"
                  step="0.01"
                  className="input mt-1"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button className="btn" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={convert} disabled={pending}>
                {pending ? "Converting…" : "Convert"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
