"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, MapPin, Link2, AlignLeft, User } from "lucide-react";

type LeadForEdit = {
  id: string;
  url: string | null;
  address: string | null;
  description: string | null;
  ownerEmail: string | null;
};

export default function LeadAboutEditor({ lead }: { lead: LeadForEdit }) {
  const [data, setData] = useState(lead);
  const [saving, setSaving] = useState<string | null>(null);
  const [, start] = useTransition();
  const router = useRouter();

  async function save(key: "url" | "address" | "description", value: string) {
    setSaving(key);
    try {
      const res = await fetch(`/api/internal/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ [key]: value || null }),
      });
      if (!res.ok) {
        toast.error("Failed to save");
        return;
      }
      start(() => router.refresh());
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="py-1">
      <InlineRow
        label="Address"
        icon={<MapPin size={13} />}
        value={data.address}
        saving={saving === "address"}
        onCommit={(v) => {
          setData({ ...data, address: v });
          void save("address", v);
        }}
      />
      <InlineRow
        label="Website"
        icon={<Link2 size={13} />}
        value={data.url}
        kind="url"
        saving={saving === "url"}
        onCommit={(v) => {
          setData({ ...data, url: v });
          void save("url", v);
        }}
      />
      <InlineRow
        label="Description"
        icon={<AlignLeft size={13} />}
        value={data.description}
        multiline
        saving={saving === "description"}
        onCommit={(v) => {
          setData({ ...data, description: v });
          void save("description", v);
        }}
      />
      {data.ownerEmail && (
        <ReadOnlyRow
          label="Owner"
          icon={<User size={13} />}
          value={data.ownerEmail}
        />
      )}
    </div>
  );
}

function InlineRow({
  label,
  icon,
  value,
  kind = "text",
  multiline,
  saving,
  onCommit,
}: {
  label: string;
  icon?: React.ReactNode;
  value: string | null;
  kind?: "text" | "url";
  multiline?: boolean;
  saving: boolean;
  onCommit: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState<string>(value ?? "");

  const commit = () => {
    setEditing(false);
    if (local !== (value ?? "")) onCommit(local);
  };

  if (!editing) {
    // URL fields: single-click opens link, double-click edits
    if (kind === "url" && value) {
      return (
        <div
          className="group flex items-center gap-2.5 w-full text-left px-3 py-2 hover:bg-surface/70 rounded transition-colors"
          onDoubleClick={() => {
            setLocal(value ?? "");
            setEditing(true);
          }}
        >
          {icon && <span className="text-mutedSoft flex-shrink-0">{icon}</span>}
          <a
            href={value.startsWith("http") ? value : `https://${value}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center gap-1 text-accent break-all text-[13px] min-w-0 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="truncate">{value}</span>
            <ExternalLink size={11} className="flex-shrink-0" />
          </a>
          {saving && <span className="text-[10px] text-mutedSoft">saving…</span>}
        </div>
      );
    }

    return (
      <button
        className="group flex items-center gap-2.5 w-full text-left px-3 py-2 hover:bg-surface/70 rounded transition-colors"
        onClick={() => {
          setLocal(value ?? "");
          setEditing(true);
        }}
      >
        {icon && <span className="text-mutedSoft flex-shrink-0">{icon}</span>}
        {value ? (
          <span className="flex-1 text-[13px] whitespace-pre-wrap">{value}</span>
        ) : (
          <span className="flex-1 text-[13px] text-mutedSoft">
            Add {label.toLowerCase()}…
          </span>
        )}
        {saving && <span className="text-[10px] text-mutedSoft">saving…</span>}
      </button>
    );
  }

  return (
    <div className="flex items-start gap-2.5 px-3 py-2">
      {icon && <span className="text-mutedSoft flex-shrink-0 mt-1.5">{icon}</span>}
      <div className="flex-1">
        {multiline ? (
          <textarea
            autoFocus
            className="input min-h-[72px]"
            placeholder={`Add ${label.toLowerCase()}…`}
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Escape") setEditing(false);
            }}
          />
        ) : (
          <input
            autoFocus
            type={kind === "url" ? "url" : "text"}
            className="input"
            placeholder={`Add ${label.toLowerCase()}…`}
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setEditing(false);
            }}
          />
        )}
        {saving && <span className="text-[10px] text-mutedSoft">saving…</span>}
      </div>
    </div>
  );
}

function ReadOnlyRow({
  label,
  icon,
  value,
}: {
  label: string;
  icon?: React.ReactNode;
  value: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2.5 px-3 py-2">
      {icon && <span className="text-mutedSoft flex-shrink-0">{icon}</span>}
      <span className="flex-1 text-[13px] break-all">{value}</span>
    </div>
  );
}
