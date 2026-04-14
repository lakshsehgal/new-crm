"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Send, Copy } from "lucide-react";

type Endpoint = {
  id: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  description: string | null;
  lastStatus: number | null;
  lastAt: string | null;
};

export default function WebhooksUI({
  allEvents,
  endpoints,
}: {
  allEvents: string[];
  endpoints: Endpoint[];
}) {
  const [pending, start] = useTransition();
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const router = useRouter();

  async function create() {
    if (!url.trim()) return toast.error("URL required");
    const res = await fetch("/api/internal/admin/webhooks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url, description, events: selected }),
    });
    if (!res.ok) return toast.error("Failed");
    setUrl(""); setDescription(""); setSelected([]);
    toast.success("Endpoint added");
    start(() => router.refresh());
  }

  async function test(id: string) {
    const res = await fetch(`/api/internal/admin/webhooks/${id}/test`, { method: "POST" });
    if (res.ok) toast.success("Test sent");
    else toast.error("Failed");
  }

  async function remove(id: string) {
    if (!confirm("Delete this webhook endpoint?")) return;
    const res = await fetch(`/api/internal/admin/webhooks/${id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Failed");
    toast.success("Deleted");
    start(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="block col-span-1"><span className="label">Endpoint URL</span>
            <input className="input mt-1" placeholder="https://n8n.example.com/webhook/..." value={url} onChange={(e) => setUrl(e.target.value)} />
          </label>
          <label className="block col-span-1"><span className="label">Description</span>
            <input className="input mt-1" value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
        </div>
        <div>
          <div className="label mb-2">Events</div>
          <div className="flex flex-wrap gap-2">
            {allEvents.map((ev) => {
              const active = selected.includes(ev);
              return (
                <button
                  key={ev}
                  type="button"
                  onClick={() => setSelected(active ? selected.filter((x) => x !== ev) : [...selected, ev])}
                  className={"badge cursor-pointer " + (active ? "bg-accentSoft text-accent border-accent" : "")}
                >
                  {ev}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex justify-end">
          <button className="btn-primary" onClick={create} disabled={pending}><Plus size={14}/>Add endpoint</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="tbl">
          <thead><tr><th>URL</th><th>Events</th><th>Secret</th><th>Last</th><th></th></tr></thead>
          <tbody>
            {endpoints.map((e) => (
              <tr key={e.id}>
                <td className="truncate max-w-[300px]">{e.url}<div className="text-xs text-muted">{e.description}</div></td>
                <td className="text-xs">{e.events.join(", ")}</td>
                <td>
                  <button
                    className="btn-ghost"
                    onClick={() => { navigator.clipboard.writeText(e.secret); toast.success("Secret copied"); }}
                    title="Copy secret"
                  >
                    <Copy size={14}/> copy
                  </button>
                </td>
                <td className="text-xs text-muted">
                  {e.lastStatus ? `HTTP ${e.lastStatus}` : "—"}
                  {e.lastAt && <div>{new Date(e.lastAt).toLocaleString()}</div>}
                </td>
                <td className="text-right flex gap-1 justify-end">
                  <button className="btn-ghost" onClick={() => test(e.id)} title="Send test"><Send size={14}/></button>
                  <button className="btn-ghost" onClick={() => remove(e.id)}><Trash2 size={14}/></button>
                </td>
              </tr>
            ))}
            {endpoints.length === 0 && <tr><td colSpan={5} className="text-center text-muted py-8">No endpoints yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
