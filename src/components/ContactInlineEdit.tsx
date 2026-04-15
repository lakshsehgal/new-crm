"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mail, Phone, Pencil, X, Check } from "lucide-react";

type Contact = {
  id: string;
  email: string | null;
  phone: string | null;
};

/**
 * Compact inline editor for a contact's email + phone. Shows the current
 * values as mailto/tel links; clicking the pencil opens an inline form.
 * Used in the Opportunity / Lead Contacts section.
 */
export default function ContactInlineEdit({ contact }: { contact: Contact }) {
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState(contact.email ?? "");
  const [phone, setPhone] = useState(contact.phone ?? "");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEmail(contact.email ?? "");
    setPhone(contact.phone ?? "");
  }, [contact.email, contact.phone]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) {
        if (editing) setEditing(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [editing]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/internal/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim() || null,
          phone: phone.trim() || null,
        }),
      });
      if (!res.ok) {
        toast.error("Failed to save");
        return;
      }
      toast.success("Saved");
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2 text-muted">
        {contact.email && (
          <a
            href={`mailto:${contact.email}`}
            title={contact.email}
            className="hover:text-ink"
            onClick={(e) => e.stopPropagation()}
          >
            <Mail size={13} />
          </a>
        )}
        {contact.phone && (
          <a
            href={`tel:${contact.phone}`}
            title={contact.phone}
            className="hover:text-ink"
            onClick={(e) => e.stopPropagation()}
          >
            <Phone size={13} />
          </a>
        )}
        <button
          className="hover:text-ink opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setEditing(true);
          }}
          title="Edit email & phone"
        >
          <Pencil size={11} />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="flex items-center gap-1 z-10"
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="email"
        className="input !px-2 !py-1 !text-[12px] w-44"
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoFocus
      />
      <input
        type="tel"
        className="input !px-2 !py-1 !text-[12px] w-32"
        placeholder="phone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <button
        className="size-6 grid place-items-center rounded text-emerald-600 hover:bg-emerald-50"
        onClick={save}
        disabled={saving}
        title="Save"
      >
        <Check size={13} />
      </button>
      <button
        className="size-6 grid place-items-center rounded text-mutedSoft hover:bg-surface"
        onClick={() => setEditing(false)}
        title="Cancel"
      >
        <X size={13} />
      </button>
    </div>
  );
}
