"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StickyNote, Mail, MessageSquare, Phone, Sparkles } from "lucide-react";

type Activity = {
  id: string;
  type: "NOTE" | "CALL" | "MEETING" | "TASK" | "EMAIL";
  title: string;
  body: string | null;
  createdAt: string;
  user?: { email: string; name: string | null } | null;
};

export default function LeadActivityFeed({
  leadId,
  activities,
}: {
  leadId: string;
  activities: Activity[];
}) {
  const [tab, setTab] = useState<"all" | "important" | "conversations" | "notes">("all");
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  const filtered = activities.filter((a) => {
    if (tab === "notes") return a.type === "NOTE";
    if (tab === "conversations") return a.type === "EMAIL" || a.type === "CALL" || a.type === "MEETING";
    return true;
  });

  async function addNote() {
    if (!note.trim()) return;
    const res = await fetch("/api/internal/activities", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ leadId, type: "NOTE", title: note.slice(0, 80), body: note }),
    });
    if (!res.ok) {
      toast.error("Failed to add note");
      return;
    }
    toast.success("Note added");
    setNote("");
    setNoteOpen(false);
    start(() => router.refresh());
  }

  return (
    <div className="flex flex-col h-full">
      {/* Action bar */}
      <div className="h-12 border-b border-border px-5 flex items-center gap-2 bg-white flex-shrink-0">
        <button className="btn" onClick={() => setNoteOpen((o) => !o)}>
          <StickyNote size={14} /> Note
        </button>
        <button className="btn" title="Email (requires Gmail connection)">
          <Mail size={14} /> Email
        </button>
        <button className="btn opacity-60 cursor-not-allowed" title="SMS coming soon">
          <MessageSquare size={14} /> SMS
        </button>
        <button className="btn" title="Call logging">
          <Phone size={14} /> Call
        </button>
      </div>

      {/* Tabs */}
      <div className="px-5 pt-4 border-b border-border bg-white">
        <div className="flex items-center gap-5 text-[13px]">
          {[
            { id: "all", label: "All" },
            { id: "important", label: "Important" },
            { id: "conversations", label: "Conversations" },
            { id: "notes", label: "Notes & Summaries" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={
                "py-2 border-b-2 transition " +
                (tab === t.id
                  ? "border-accent text-ink font-medium"
                  : "border-transparent text-muted hover:text-ink")
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Note composer */}
      {noteOpen && (
        <div className="border-b border-border p-4 bg-amber-50/40 space-y-2">
          <textarea
            className="input min-h-[100px] bg-white"
            placeholder="Write a note about this lead…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button className="btn" onClick={() => setNoteOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={addNote} disabled={pending}>
              {pending ? "Saving…" : "Save note"}
            </button>
          </div>
        </div>
      )}

      {/* Feed */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center text-mutedSoft text-sm py-12">
            No activity yet. Add a note to get started.
          </div>
        ) : (
          filtered.map((a) => (
            <div key={a.id} className="flex gap-3">
              <div className="size-6 rounded-md bg-surface border border-border grid place-items-center text-muted flex-shrink-0 mt-0.5">
                <ActivityIcon type={a.type} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium">{a.title}</span>
                  <span className="badge text-[10px]">{a.type}</span>
                  <span className="ml-auto text-[11px] text-muted">
                    {new Date(a.createdAt).toLocaleString()}
                  </span>
                </div>
                {a.body && (
                  <p className="text-[13px] text-muted mt-1 whitespace-pre-wrap">
                    {a.body}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ActivityIcon({ type }: { type: string }) {
  const size = 12;
  switch (type) {
    case "NOTE":
      return <StickyNote size={size} />;
    case "EMAIL":
      return <Mail size={size} />;
    case "CALL":
      return <Phone size={size} />;
    case "MEETING":
      return <Sparkles size={size} />;
    default:
      return <StickyNote size={size} />;
  }
}
