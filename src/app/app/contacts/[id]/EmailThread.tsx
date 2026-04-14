"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";

type Email = {
  id: string;
  subject: string;
  snippet: string | null;
  fromEmail: string;
  fromName: string | null;
  direction: string;
  sentAt: string;
};

export default function EmailThread({
  contactId,
  emails,
}: {
  contactId: string;
  emails: Email[];
}) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  async function send() {
    const res = await fetch("/api/internal/emails/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contactId, subject, bodyText: body }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      return toast.error(j.error ?? "Failed to send");
    }
    toast.success("Email sent");
    setOpen(false);
    setSubject("");
    setBody("");
    start(() => router.refresh());
  }

  return (
    <div>
      <div className="p-3 border-b border-border flex items-center gap-2">
        <button className="btn-primary" onClick={() => setOpen((x) => !x)}>
          <Send size={14} /> New email
        </button>
        <form
          action={async () => {
            const res = await fetch("/api/internal/gmail/sync", { method: "POST" });
            if (res.ok) {
              toast.success("Inbox synced");
              start(() => router.refresh());
            } else toast.error("Sync failed");
          }}
        >
          <button className="btn" type="submit">Sync inbox</button>
        </form>
      </div>
      {open && (
        <div className="p-3 border-b border-border space-y-2">
          <input className="input" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <textarea className="input min-h-[120px]" placeholder="Write a message…" value={body} onChange={(e) => setBody(e.target.value)} />
          <div className="flex justify-end gap-2">
            <button className="btn" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={send} disabled={pending}>Send</button>
          </div>
        </div>
      )}
      <ul className="divide-y divide-border">
        {emails.length === 0 && (
          <li className="p-4 text-sm text-muted">
            No emails synced yet for this contact.
          </li>
        )}
        {emails.map((e) => (
          <li key={e.id} className="p-3 text-sm">
            <div className="flex items-center gap-2">
              <span className={"badge " + (e.direction === "outbound" ? "bg-accentSoft text-accent" : "")}>
                {e.direction}
              </span>
              <span className="font-medium truncate">{e.subject}</span>
              <span className="ml-auto text-xs text-muted">{new Date(e.sentAt).toLocaleString()}</span>
            </div>
            <div className="text-muted text-xs mt-1">{e.fromName ?? e.fromEmail}</div>
            {e.snippet && <p className="mt-1 text-muted line-clamp-2">{e.snippet}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
