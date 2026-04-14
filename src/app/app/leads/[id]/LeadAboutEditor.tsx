"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";

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
    <div>
      <InlineRow
        label="Website"
        value={data.url}
        kind="url"
        saving={saving === "url"}
        onCommit={(v) => {
          setData({ ...data, url: v });
          void save("url", v);
        }}
      />
      <InlineRow
        label="Address"
        value={data.address}
        saving={saving === "address"}
        onCommit={(v) => {
          setData({ ...data, address: v });
          void save("address", v);
        }}
      />
      <InlineRow
        label="Description"
        value={data.description}
        multiline
        saving={saving === "description"}
        onCommit={(v) => {
          setData({ ...data, description: v });
          void save("description", v);
        }}
      />
      <ReadOnlyRow label="Owner" value={data.ownerEmail} />
    </div>
  );
}

function InlineRow({
  label,
  value,
  kind = "text",
  multiline,
  saving,
  onCommit,
}: {
  label: string;
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
    return (
      <button
        className="block w-full text-left px-4 py-2 hover:bg-surface/70 transition-colors"
        onClick={() => {
          setLocal(value ?? "");
          setEditing(true);
        }}
      >
        {value ? (
          <>
            <div className="text-[11px] uppercase tracking-wide text-mutedSoft mb-0.5 flex items-center gap-1">
              <span>{label}</span>
              {saving && <span className="text-[10px] lowercase text-mutedSoft">saving…</span>}
            </div>
            {kind === "url" ? (
              <span className="flex items-center gap-1 text-accent break-all text-[13px]">
                <span className="truncate">{value}</span>
                <ExternalLink size={11} className="flex-shrink-0" />
              </span>
            ) : (
              <div className="text-[13px] whitespace-pre-wrap">{value}</div>
            )}
          </>
        ) : (
          <span className="text-[13px] text-mutedSoft italic">
            Add {label.toLowerCase()}…
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="px-4 py-2">
      <div className="text-[11px] uppercase tracking-wide text-mutedSoft mb-1 flex items-center gap-2">
        <span>{label}</span>
        {saving && <span className="text-[10px] lowercase">saving…</span>}
      </div>
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
    </div>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="px-4 py-2">
      <div className="text-[11px] uppercase tracking-wide text-mutedSoft mb-0.5">{label}</div>
      <div className="text-[13px] break-all">{value}</div>
    </div>
  );
}
