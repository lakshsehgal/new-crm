"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Plus, Trash2 } from "lucide-react";

type Key = {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

export default function ApiKeysUI({ keys }: { keys: Key[] }) {
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  const [fresh, setFresh] = useState<string | null>(null);
  const router = useRouter();

  async function create() {
    if (!name.trim()) return;
    const res = await fetch("/api/internal/api-keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return toast.error("Failed");
    const j = await res.json();
    setFresh(j.plaintext);
    setName("");
    toast.success("Key created — copy it now");
    start(() => router.refresh());
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this API key? This cannot be undone.")) return;
    const res = await fetch(`/api/internal/api-keys/${id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Failed");
    toast.success("Revoked");
    start(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      <div className="card p-4 flex items-center gap-2">
        <input className="input" placeholder="Key name (e.g. n8n-production)" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn-primary" onClick={create} disabled={pending}><Plus size={14}/>Create</button>
      </div>

      {fresh && (
        <div className="card p-4 border-emerald-300 bg-emerald-50">
          <div className="font-medium text-emerald-900">Copy your new key now — you won't see it again.</div>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 bg-white border border-emerald-200 rounded-md px-2 py-1 text-xs break-all">{fresh}</code>
            <button className="btn" onClick={() => { navigator.clipboard.writeText(fresh); toast.success("Copied"); }}>
              <Copy size={14} /> Copy
            </button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="tbl">
          <thead>
            <tr><th>Name</th><th>Prefix</th><th>Created</th><th>Last used</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id}>
                <td className="font-medium">{k.name}</td>
                <td><code>nck_{k.prefix}…</code></td>
                <td className="text-muted">{new Date(k.createdAt).toLocaleDateString()}</td>
                <td className="text-muted">{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : "—"}</td>
                <td>{k.revokedAt ? <span className="badge bg-red-50 text-red-700 border-red-200">revoked</span> : <span className="badge bg-emerald-50 text-emerald-700 border-emerald-200">active</span>}</td>
                <td className="text-right">
                  {!k.revokedAt && (
                    <button className="btn-ghost" onClick={() => revoke(k.id)}><Trash2 size={14}/></button>
                  )}
                </td>
              </tr>
            ))}
            {keys.length === 0 && (
              <tr><td colSpan={6} className="text-center text-muted py-8">No keys yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
