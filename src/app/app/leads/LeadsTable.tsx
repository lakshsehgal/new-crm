"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatMoney } from "@/lib/utils";
import ColumnPicker from "@/components/ColumnPicker";
import { Trash2, X } from "lucide-react";

type Row = {
  id: string;
  name: string;
  status: string;
  contactsCount: number;
  opportunitiesCount: number;
  pipelineValue: number;
  ownerEmail: string | null;
  updatedAt: string;
};

const statusStyles: Record<string, string> = {
  POTENTIAL: "bg-amber-50 text-amber-700 border-amber-200",
  QUALIFIED: "bg-blue-50 text-blue-700 border-blue-200",
  CUSTOMER: "bg-emerald-50 text-emerald-700 border-emerald-200",
  BAD_FIT: "bg-rose-50 text-rose-700 border-rose-200",
  CHURNED: "bg-gray-100 text-gray-600 border-gray-200",
};

const STATUSES = ["POTENTIAL", "QUALIFIED", "CUSTOMER", "BAD_FIT", "CHURNED"];

const COLUMNS = [
  { key: "name", label: "Company", locked: true },
  { key: "status", label: "Status" },
  { key: "contacts", label: "Contacts" },
  { key: "opps", label: "Opportunities" },
  { key: "value", label: "Pipeline value" },
  { key: "owner", label: "Owner" },
  { key: "updated", label: "Updated" },
];

export default function LeadsTable({ rows }: { rows: Row[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
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
    if (!confirm(`Delete ${selected.size} leads? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await Promise.allSettled(
        [...selected].map((id) =>
          fetch(`/api/internal/leads/${id}`, { method: "DELETE" }),
        ),
      );
      toast.success(`Deleted ${selected.size} leads`);
      setSelected(new Set());
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function bulkSetStatus() {
    if (!bulkStatus) return;
    setBusy(true);
    try {
      await Promise.allSettled(
        [...selected].map((id) =>
          fetch(`/api/internal/leads/${id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ status: bulkStatus }),
          }),
        ),
      );
      toast.success(`Updated ${selected.size} leads`);
      setSelected(new Set());
      setBulkStatus("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const allChecked = rows.length > 0 && selected.size === rows.length;

  return (
    <>
      <div className="flex items-center gap-2 justify-end">
        <ColumnPicker storageKey="leads" columns={COLUMNS} />
      </div>

      {selected.size > 0 && (
        <div className="card px-4 py-2 bg-accentSoft border-accent/30 flex items-center gap-3 fade-in">
          <span className="text-[13px] font-medium text-accent">
            {selected.size} selected
          </span>
          <select
            className="input !w-44 !py-1"
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
          >
            <option value="">Set status…</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
          <button
            className="btn"
            disabled={!bulkStatus || busy}
            onClick={bulkSetStatus}
          >
            Apply
          </button>
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

      <div className="card overflow-hidden" data-col-scope="leads">
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
              <th data-col="name">Company</th>
              <th data-col="status">Status</th>
              <th data-col="contacts">Contacts</th>
              <th data-col="opps">Opps</th>
              <th data-col="value">Pipeline value</th>
              <th data-col="owner">Owner</th>
              <th data-col="updated">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l, idx) => {
              const checked = selected.has(l.id);
              return (
                <tr key={l.id} className={checked ? "bg-accentSoft/40" : ""}>
                  <td>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(l.id)}
                    />
                  </td>
                  <td className="text-mutedSoft text-[12px]">{idx + 1}</td>
                  <td data-col="name">
                    <Link
                      href={`/app/leads/${l.id}`}
                      className="font-medium text-accent hover:underline"
                    >
                      {l.name}
                    </Link>
                  </td>
                  <td data-col="status">
                    <span className={`badge ${statusStyles[l.status] ?? ""}`}>
                      {l.status.replace("_", " ")}
                    </span>
                  </td>
                  <td data-col="contacts">{l.contactsCount}</td>
                  <td data-col="opps">{l.opportunitiesCount}</td>
                  <td data-col="value">
                    {l.pipelineValue > 0 ? formatMoney(l.pipelineValue) : "—"}
                  </td>
                  <td data-col="owner" className="text-muted">
                    {l.ownerEmail ?? "—"}
                  </td>
                  <td data-col="updated" className="text-muted">
                    {new Date(l.updatedAt).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center text-muted py-10">
                  No leads in this filter. Click "New lead" to add your first
                  company.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
