"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

type Stage = { id: string; name: string; probability: number; isWon: boolean; isLost: boolean; order: number };
type Pipeline = { id: string; name: string; isDefault: boolean; stages: Stage[] };

export default function PipelinesUI({ pipelines }: { pipelines: Pipeline[] }) {
  const [pending, start] = useTransition();
  const [newName, setNewName] = useState("");
  const router = useRouter();

  async function createPipeline() {
    if (!newName.trim()) return;
    const res = await fetch("/api/internal/admin/pipelines", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    if (!res.ok) return toast.error("Failed");
    setNewName("");
    toast.success("Pipeline created");
    start(() => router.refresh());
  }

  async function addStage(pipelineId: string, name: string) {
    if (!name.trim()) return;
    const res = await fetch(`/api/internal/admin/pipelines/${pipelineId}/stages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return toast.error("Failed");
    toast.success("Stage added");
    start(() => router.refresh());
  }

  async function removeStage(stageId: string) {
    if (!confirm("Delete this stage? Opportunities will be orphaned.")) return;
    const res = await fetch(`/api/internal/admin/stages/${stageId}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Failed");
    toast.success("Stage removed");
    start(() => router.refresh());
  }

  return (
    <div className="space-y-5">
      <div className="card p-4 flex gap-2 items-end">
        <label className="flex-1">
          <span className="label">New pipeline name</span>
          <input className="input mt-1" value={newName} onChange={(e) => setNewName(e.target.value)} />
        </label>
        <button className="btn-primary" onClick={createPipeline} disabled={pending}><Plus size={14} /> Create</button>
      </div>

      {pipelines.map((p) => (
        <section key={p.id} className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">{p.name} {p.isDefault && <span className="badge ml-2">default</span>}</h2>
              <p className="text-xs text-muted">{p.stages.length} stages</p>
            </div>
          </div>
          <ul className="mt-3 space-y-2">
            {p.stages.map((s) => (
              <li key={s.id} className="flex items-center gap-2 text-sm">
                <span className="w-6 text-muted">{s.order + 1}.</span>
                <span className="flex-1">{s.name}</span>
                {s.isWon && <span className="badge bg-emerald-50 text-emerald-700 border-emerald-200">Won</span>}
                {s.isLost && <span className="badge bg-red-50 text-red-700 border-red-200">Lost</span>}
                <span className="text-muted">{s.probability}%</span>
                <button className="btn-ghost" onClick={() => removeStage(s.id)}><Trash2 size={14}/></button>
              </li>
            ))}
          </ul>
          <form
            className="mt-3 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              await addStage(p.id, String(fd.get("name") ?? ""));
              (e.target as HTMLFormElement).reset();
            }}
          >
            <input name="name" className="input flex-1" placeholder="New stage name" />
            <button className="btn">Add stage</button>
          </form>
        </section>
      ))}
    </div>
  );
}
