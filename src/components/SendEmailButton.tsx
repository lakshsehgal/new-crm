"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mail, X } from "lucide-react";

type Contact = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};

type Template = {
  id: string;
  name: string;
  subject: string;
  body: string;
};

type Variables = {
  firstName?: string;
  lastName?: string;
  company?: string;
  email?: string;
  myName?: string;
};

export default function SendEmailButton({
  contacts,
  defaultContext,
  compact,
}: {
  contacts: Contact[];
  /** Values used to substitute {{firstName}} etc. */
  defaultContext: Variables;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [toId, setToId] = useState<string>(
    contacts.find((c) => c.email)?.id ?? "",
  );
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!open || templatesLoaded) return;
    fetch("/api/internal/email-templates")
      .then((r) => r.json())
      .then((j) => {
        setTemplates(j.data ?? []);
        setTemplatesLoaded(true);
      })
      .catch(() => setTemplatesLoaded(true));
  }, [open, templatesLoaded]);

  const currentContact = contacts.find((c) => c.id === toId);

  function applyTemplate(id: string) {
    if (!id) return;
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    const ctx: Variables = {
      ...defaultContext,
      firstName: currentContact?.firstName ?? defaultContext.firstName,
      lastName: currentContact?.lastName ?? defaultContext.lastName,
      email: currentContact?.email ?? defaultContext.email,
    };
    setSubject(substitute(t.subject, ctx));
    setBody(substitute(t.body, ctx));
  }

  async function send() {
    if (!currentContact?.email) {
      toast.error("Pick a contact with an email address");
      return;
    }
    if (!subject.trim()) {
      toast.error("Subject is required");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/internal/emails/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contactId: currentContact.id,
          to: currentContact.email,
          subject,
          bodyText: body,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(
          j.error ?? "Failed to send — is Gmail connected in Settings?",
        );
        return;
      }
      toast.success("Email sent");
      setOpen(false);
      setSubject("");
      setBody("");
      router.refresh();
    } finally {
      setSending(false);
    }
  }

  const buttonCls = compact ? "btn" : "btn-primary";
  const disabled = contacts.length === 0;

  return (
    <>
      <button
        className={buttonCls}
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={disabled ? "Add a contact first" : "Compose email"}
      >
        <Mail size={14} /> {compact ? "Email" : "Send email"}
      </button>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div
            className="modal-card w-full max-w-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Send email</h2>
              <button
                className="size-7 grid place-items-center rounded text-muted hover:bg-surface"
                onClick={() => setOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <label className="block">
                <span className="label">To</span>
                <select
                  className="input mt-1"
                  value={toId}
                  onChange={(e) => setToId(e.target.value)}
                >
                  {contacts.map((c) => {
                    const name =
                      [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email || "(no name)";
                    return (
                      <option key={c.id} value={c.id} disabled={!c.email}>
                        {name}
                        {c.email ? ` · ${c.email}` : " · (no email)"}
                      </option>
                    );
                  })}
                </select>
              </label>
              <label className="block">
                <span className="label">Template</span>
                <select
                  className="input mt-1"
                  defaultValue=""
                  onChange={(e) => applyTemplate(e.target.value)}
                >
                  <option value="">— Choose a template —</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block mt-3">
              <span className="label">Subject</span>
              <input
                className="input mt-1"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
              />
            </label>

            <label className="block mt-3">
              <span className="label">Body</span>
              <textarea
                className="input mt-1 min-h-[220px] font-sans"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message…"
              />
            </label>

            <div className="flex justify-end gap-2 mt-5">
              <button className="btn" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={send} disabled={sending}>
                {sending ? "Sending…" : "Send via Gmail"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function substitute(template: string, ctx: Variables): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const v = (ctx as any)[key];
    return v == null ? `{{${key}}}` : String(v);
  });
}
