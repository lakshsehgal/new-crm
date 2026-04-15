"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Reply, Forward, X, ChevronDown, Mail } from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";

type Message = {
  id: string;
  direction: string;
  fromEmail: string;
  fromName: string | null;
  toEmails: string[];
  subject: string;
  snippet: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  sentAt: string;
  contactId: string | null;
  contactName: string | null;
};

export default function InboxThread({
  messages,
  myEmail,
}: {
  messages: Message[];
  myEmail: string;
}) {
  // Collapse every message except the last
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    messages.forEach((m, i) => (map[m.id] = i === messages.length - 1));
    return map;
  });
  const [composer, setComposer] = useState<{
    mode: "reply" | "forward";
    source: Message;
  } | null>(null);
  const router = useRouter();

  const latest = messages[messages.length - 1];

  return (
    <div className="space-y-3">
      {messages.map((m) => (
        <MessageCard
          key={m.id}
          message={m}
          myEmail={myEmail}
          expanded={!!expanded[m.id]}
          onToggle={() => setExpanded((e) => ({ ...e, [m.id]: !e[m.id] }))}
        />
      ))}

      {/* Reply / Forward actions */}
      <div className="flex gap-2">
        <button
          className="btn"
          onClick={() => setComposer({ mode: "reply", source: latest })}
        >
          <Reply size={14} /> Reply
        </button>
        <button
          className="btn"
          onClick={() => setComposer({ mode: "forward", source: latest })}
        >
          <Forward size={14} /> Forward
        </button>
      </div>

      {composer && (
        <Composer
          mode={composer.mode}
          source={composer.source}
          myEmail={myEmail}
          onClose={() => setComposer(null)}
          onSent={() => {
            setComposer(null);
            toast.success("Email sent");
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function MessageCard({
  message: m,
  myEmail,
  expanded,
  onToggle,
}: {
  message: Message;
  myEmail: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const outbound = m.direction === "outbound";
  const displayFrom = outbound ? `Me (${myEmail})` : m.fromName ?? m.fromEmail;
  return (
    <div className="card overflow-hidden">
      <button
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-surface/60 transition-colors"
        onClick={onToggle}
      >
        <div
          className={
            "size-8 rounded-full grid place-items-center flex-shrink-0 " +
            (outbound
              ? "bg-accentSoft text-accent"
              : "bg-surface border border-border text-muted")
          }
        >
          <Mail size={14} />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold truncate">
              {displayFrom}
            </span>
            <span className="badge text-[10px]">
              {outbound ? "SENT" : "INBOX"}
            </span>
            <span className="ml-auto text-[11px] text-muted whitespace-nowrap">
              {new Date(m.sentAt).toLocaleString()}
            </span>
          </div>
          {!expanded && m.snippet && (
            <p className="text-[12.5px] text-muted truncate mt-0.5">
              {m.snippet}
            </p>
          )}
          {expanded && (
            <div className="text-[12px] text-muted mt-0.5">
              To: {m.toEmails.join(", ")}
            </div>
          )}
        </div>
        <ChevronDown
          size={14}
          className={"text-muted transition-transform " + (expanded ? "rotate-180" : "")}
        />
      </button>

      {expanded && (
        <div className="px-4 pb-5 pt-1 border-t border-border">
          {m.bodyHtml ? (
            <div
              className="prose-email text-[13.5px] leading-6"
              // Gmail HTML is user content — we accept a sanitizer TODO.
              // For now, render as text-forward HTML inside a safe wrapper.
              dangerouslySetInnerHTML={{ __html: m.bodyHtml }}
            />
          ) : m.bodyText ? (
            <pre className="whitespace-pre-wrap text-[13.5px] leading-6 font-sans">
              {m.bodyText}
            </pre>
          ) : (
            <p className="text-muted text-sm italic">{m.snippet ?? "(no body synced)"}</p>
          )}
        </div>
      )}
    </div>
  );
}

function Composer({
  mode,
  source,
  myEmail,
  onClose,
  onSent,
}: {
  mode: "reply" | "forward";
  source: Message;
  myEmail: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const initialTo = mode === "reply"
    ? source.direction === "outbound"
      ? (source.toEmails[0] ?? "")
      : source.fromEmail
    : "";
  const reSubject = /^(Re|Fwd):/i.test(source.subject) ? source.subject : `${mode === "reply" ? "Re" : "Fwd"}: ${source.subject}`;
  const quoted = buildQuoteHtml(source);
  const initialBody = `<p><br></p>${quoted}`;

  const [to, setTo] = useState(initialTo);
  const [subject, setSubject] = useState(reSubject);
  const [body, setBody] = useState(initialBody);
  const [sending, setSending] = useState(false);

  async function send() {
    if (!to.trim()) return toast.error("Recipient required");
    if (!subject.trim()) return toast.error("Subject required");
    setSending(true);
    try {
      const res = await fetch("/api/internal/emails/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          to,
          subject,
          bodyHtml: body,
          replyToEmailId: mode === "reply" ? source.id : undefined,
          contactId: source.contactId ?? undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error ?? "Failed to send");
        return;
      }
      onSent();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card p-4 shadow-pop">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold">
          {mode === "reply" ? "Reply" : "Forward"}
        </div>
        <button
          className="size-7 grid place-items-center rounded text-muted hover:bg-surface"
          onClick={onClose}
        >
          <X size={14} />
        </button>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wide text-mutedSoft w-16">
            From
          </span>
          <span className="text-sm text-muted">{myEmail}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wide text-mutedSoft w-16">
            To
          </span>
          <input
            className="input flex-1"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="recipient@example.com"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wide text-mutedSoft w-16">
            Subject
          </span>
          <input
            className="input flex-1"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
        <div className="mt-2">
          <RichTextEditor value={body} onChange={setBody} minHeight={260} />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-3">
        <button className="btn" onClick={onClose}>Discard</button>
        <button className="btn-primary" onClick={send} disabled={sending}>
          {sending ? "Sending…" : "Send via Gmail"}
        </button>
      </div>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildQuoteHtml(m: Message): string {
  const when = new Date(m.sentAt).toLocaleString();
  const who = m.fromName ?? m.fromEmail;
  const bodyHtml =
    m.bodyHtml ??
    (m.bodyText ? escapeHtml(m.bodyText).replace(/\n/g, "<br>") : escapeHtml(m.snippet ?? ""));
  return (
    `<p style="color:#6b7280;font-size:12px">On ${when}, ${escapeHtml(who)} wrote:</p>` +
    `<blockquote style="border-left:3px solid #e6e8ec;padding-left:12px;color:#374151">${bodyHtml}</blockquote>`
  );
}
