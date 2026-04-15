"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ColumnPicker from "@/components/ColumnPicker";
import { initials } from "@/lib/utils";
import { Trash2, X } from "lucide-react";

type Row = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
  leadId: string | null;
  leadName: string | null;
  leadStatus: string | null;
  updatedAt: string;
};

const COLUMNS = [
  { key: "name", label: "Name", locked: true },
  { key: "company", label: "Company" },
  { key: "title", label: "Title" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "status", label: "Lead status" },
  { key: "updated", label: "Updated" },
];

export default function ContactsTable({ rows }: { rows: Row[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected((prev) =>
      prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id)),
    );
  }

  async function bulkDelete() {
    if (!confirm(`Delete ${selected.size} contacts? This cannot be undone.`))
      return;
    setBusy(true);
    try {
      await Promise.allSettled(
        [...selected].map((id) =>
          fetch(`/api/internal/contacts/${id}`, { method: "DELETE" }),
        ),
      );
      toast.success(`Deleted ${selected.size} contacts`);
      setSelected(new Set());
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const allChecked = rows.length > 0 && selected.size === rows.length;

  return (
    <>
      <div className="flex items-center gap-2 justify-end">
        <ColumnPicker storageKey="contacts" columns={COLUMNS} />
      </div>

      {selected.size > 0 && (
        <div className="card px-4 py-2 bg-accentSoft border-accent/30 flex items-center gap-3 fade-in">
          <span className="text-[13px] font-medium text-accent">
            {selected.size} selected
          </span>
          <button
            className="btn text-rose-600 hover:bg-rose-50"
            disabled={busy}
            onClick={bulkDelete}
          >
            <Trash2 size={13} /> Delete
          </button>
          <button
            className="ml-auto size-7 grid place-items-center rounded text-muted hover:bg-white"
            onClick={() => setSelected(new Set())}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="card overflow-hidden" data-col-scope="contacts">
        <table className="tbl">
          <thead>
            <tr>
              <th className="!w-8">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                />
              </th>
              <th className="!w-10 text-mutedSoft">#</th>
              <th data-col="name">Name</th>
              <th data-col="company">Company</th>
              <th data-col="title">Title</th>
              <th data-col="email">Email</th>
              <th data-col="phone">Phone</th>
              <th data-col="status">Lead status</th>
              <th data-col="updated">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c, idx) => {
              const checked = selected.has(c.id);
              const name =
                [c.firstName, c.lastName].filter(Boolean).join(" ") ||
                "(no name)";
              return (
                <tr key={c.id} className={checked ? "bg-accentSoft/40" : ""}>
                  <td>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(c.id)}
                    />
                  </td>
                  <td className="text-mutedSoft text-[12px]">{idx + 1}</td>
                  <td data-col="name">
                    <Link
                      className="flex items-center gap-2"
                      href={`/app/contacts/${c.id}`}
                    >
                      <span className="size-6 rounded-full bg-accentSoft text-accent text-[10px] font-medium grid place-items-center">
                        {initials(name, c.email)}
                      </span>
                      <span className="font-medium">{name}</span>
                    </Link>
                  </td>
                  <td data-col="company">
                    {c.leadId && c.leadName ? (
                      <Link
                        href={`/app/leads/${c.leadId}`}
                        className="text-accent hover:underline"
                      >
                        {c.leadName}
                      </Link>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td data-col="title">{c.title ?? "—"}</td>
                  <td data-col="email" className="text-muted">
                    {c.email ?? "—"}
                  </td>
                  <td data-col="phone" className="text-muted">
                    {c.phone ?? "—"}
                  </td>
                  <td data-col="status">
                    {c.leadStatus ? (
                      <span className="badge">
                        {c.leadStatus.replace("_", " ")}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td data-col="updated" className="text-muted">
                    {new Date(c.updatedAt).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center text-muted py-10">
                  No contacts yet. Click "New lead" to create your first company
                  + contact.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
