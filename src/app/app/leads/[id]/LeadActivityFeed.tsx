"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import {
  StickyNote,
  Mail,
  MessageSquare,
  Phone,
  Sparkles,
} from "lucide-react";
import SendEmailButton from "@/components/SendEmailButton";
import LeadEmailAutoSync from "@/components/LeadEmailAutoSync";

type Activity = {
  id: string;
  type: "NOTE" | "CALL" | "MEETING" | "TASK" | "EMAIL";
  title: string;
  body: string | null;
  createdAt: string;
  user?: { email: string; name: string | null } | null;
};

type Email = {
  id: string;
  subject: string;
  snippet: string | null;
  fromEmail: string;
  fromName: string | null;
  direction: string;
  sentAt: string;
};

type Contact = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};

export default function LeadActivityFeed({
  leadId,
  leadName,
  activities,
  emails,
  contacts,
  myName,
}: {
  leadId: string;
  leadName: string;
  activities: Activity[];
  emails: Email[];
  contacts: Contact[];
  myName: string | null;
}) {
  const [tab, setTab] = useState<"all" | "important" | "conversations" | "notes">("all");
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  // Merge activities + emails into a unified timeline
  const items = mergeTimeline(activities, emails);
  const filtered = items.filter((a) => {
    if (tab === "notes") return a.kind === "activity" && a.type === "NOTE";
    if (tab === "conversations") return a.kind === "email" || a.type === "CALL" || a.type === "MEETING";
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
        <SendEmailButton
          contacts={contacts}
          defaultContext={{ company: leadName, myName: myName ?? "" }}
          compact
        />
        <button className="btn opacity-60 cursor-not-allowed" title="SMS coming soon">
          <MessageSquare size={14} /> SMS
        </button>
        <button className="btn" title="Log a call">
          <Phone size={14} /> Call
        </button>
        <div className="ml-auto">
          <LeadEmailAutoSync leadId={leadId} />
        </div>
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
            No activity yet. Add a note or send an email to get started.
          </div>
        ) : (
          filtered.map((item) =>
            item.kind === "email" ? (
              <EmailRow key={"e" + item.id} email={item} />
            ) : (
              <ActivityRow key={"a" + item.id} activity={item} />
            ),
          )
        )}
      </div>
    </div>
  );
}

function ActivityRow({ activity: a }: { activity: Activity & { kind: "activity" } }) {
  return (
    <div className="flex gap-3">
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
          <p className="text-[13px] text-muted mt-1 whitespace-pre-wrap">{a.body}</p>
        )}
      </div>
    </div>
  );
}

function EmailRow({ email }: { email: Email & { kind: "email" } }) {
  const outbound = email.direction === "outbound";
  return (
    <Link
      href={`/app/inbox/${email.id}`}
      className="flex gap-3 -mx-2 px-2 py-1 rounded hover:bg-surface/60 transition-colors"
    >
      <div
        className={
          "size-6 rounded-md grid place-items-center flex-shrink-0 mt-0.5 " +
          (outbound
            ? "bg-accentSoft text-accent"
            : "bg-surface border border-border text-muted")
        }
      >
        <Mail size={12} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold truncate">{email.subject}</span>
          <span className="badge text-[10px]">{outbound ? "SENT" : "INBOX"}</span>
          <span className="ml-auto text-[11px] text-muted whitespace-nowrap">
            {new Date(email.sentAt).toLocaleString()}
          </span>
        </div>
        <div className="text-[12px] text-muted mt-0.5">
          {outbound ? "To: " : "From: "}
          {email.fromName ?? email.fromEmail}
        </div>
        {email.snippet && (
          <p className="text-[13px] text-muted mt-1 whitespace-pre-wrap line-clamp-3">
            {email.snippet}
          </p>
        )}
      </div>
    </Link>
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

type TimelineItem =
  | (Activity & { kind: "activity" })
  | (Email & { kind: "email" });

function mergeTimeline(
  activities: Activity[],
  emails: Email[],
): TimelineItem[] {
  const items: TimelineItem[] = [
    ...activities.map((a) => ({ ...a, kind: "activity" as const })),
    ...emails.map((e) => ({ ...e, kind: "email" as const })),
  ];
  items.sort((a, b) => {
    const ta = a.kind === "email" ? a.sentAt : a.createdAt;
    const tb = b.kind === "email" ? b.sentAt : b.createdAt;
    return new Date(tb).getTime() - new Date(ta).getTime();
  });
  return items;
}
