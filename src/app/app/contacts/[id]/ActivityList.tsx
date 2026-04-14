"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Activity = {
  id: string;
  type: "NOTE" | "CALL" | "MEETING" | "TASK" | "EMAIL";
  title: string;
  body: string | null;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

export default function ActivityList({
  contactId,
  activities,
}: {
  contactId: string;
  activities: Activity[];
}) {
  const [type, setType] = useState<Activity["type"]>("NOTE");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  async function add() {
    if (!title.trim()) return toast.error("Title required");
    const res = await fetch("/api/internal/activities", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contactId, type, title, body }),
    });
    if (!res.ok) return toast.error("Failed");
    toast.success("Logged");
    setTitle("");
    setBody("");
    start(() => router.refresh());
  }

  return (
    <div>
      <div className="p-3 border-b border-border flex flex-col gap-2">
        <div className="flex gap-2">
          <select className="input w-32" value={type} onChange={(e) => setType(e.target.value as any)}>
            <option value="NOTE">Note</option>
            <option value="CALL">Call</option>
            <option value="MEETING">Meeting</option>
            <option value="TASK">Task</option>
            <option value="EMAIL">Email</option>
          </select>
          <input className="input flex-1" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <button className="btn-primary" onClick={add} disabled={pending}>Log</button>
        </div>
        <textarea className="input min-h-[60px]" placeholder="Details…" value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
      <ul className="divide-y divide-border">
        {activities.length === 0 && <li className="p-4 text-sm text-muted">No activity yet.</li>}
        {activities.map((a) => (
          <li key={a.id} className="p-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="badge">{a.type}</span>
              <span className="font-medium">{a.title}</span>
              <span className="ml-auto text-xs text-muted">{new Date(a.createdAt).toLocaleString()}</span>
            </div>
            {a.body && <p className="mt-1 text-muted whitespace-pre-wrap">{a.body}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
