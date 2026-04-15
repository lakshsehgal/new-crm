"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/utils";
import ColumnPicker from "@/components/ColumnPicker";

type Stage = { id: string; name: string; isWon: boolean; isLost: boolean };
type Row = {
  id: string;
  leadId: string;
  leadName: string;
  leadStatus: string;
  name: string;
  value: string;
  stageId: string;
  contactName: string | null;
  ownerEmail: string | null;
  lastTouchpointAt: string | null;
  updatedAt: string;
};

type SortKey = "value" | "updated";

export default function OppListView({
  stages,
  rows,
}: {
  stages: Stage[];
  rows: Row[];
}) {
  const [stageFilter, setStageFilter] = useState<string>("all"); // all | stageId | open | won | lost
  const [minValue, setMinValue] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    let xs = rows;
    if (stageFilter === "open") {
      const closedIds = new Set(stages.filter((s) => s.isWon || s.isLost).map((s) => s.id));
      xs = xs.filter((r) => !closedIds.has(r.stageId));
    } else if (stageFilter === "won") {
      const wonIds = new Set(stages.filter((s) => s.isWon).map((s) => s.id));
      xs = xs.filter((r) => wonIds.has(r.stageId));
    } else if (stageFilter === "lost") {
      const lostIds = new Set(stages.filter((s) => s.isLost).map((s) => s.id));
      xs = xs.filter((r) => lostIds.has(r.stageId));
    } else if (stageFilter !== "all") {
      xs = xs.filter((r) => r.stageId === stageFilter);
    }

    if (minValue.trim()) {
      const min = Number(minValue);
      if (!Number.isNaN(min)) xs = xs.filter((r) => Number(r.value) >= min);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      xs = xs.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.leadName.toLowerCase().includes(q) ||
          (r.contactName ?? "").toLowerCase().includes(q),
      );
    }

    const sorted = [...xs].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "value") cmp = Number(a.value) - Number(b.value);
      else cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [rows, stages, stageFilter, minValue, search, sortKey, sortDir]);

  const totalValue = filtered.reduce((s, r) => s + Number(r.value || 0), 0);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  }

  const stageById = useMemo(
    () => new Map(stages.map((s) => [s.id, s])),
    [stages],
  );

  const columns = [
    { key: "name", label: "Opportunity", locked: true },
    { key: "company", label: "Company" },
    { key: "value", label: "Value" },
    { key: "stage", label: "Stage" },
    { key: "contact", label: "Contact" },
    { key: "owner", label: "Owner" },
    { key: "lastTouch", label: "Last touchpoint" },
    { key: "updated", label: "Updated" },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Filters */}
      <div className="px-6 py-3 border-b border-border bg-white flex items-center gap-2 flex-wrap">
        <input
          className="input w-64"
          placeholder="Search opportunity, company or contact…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="pill cursor-pointer"
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
        >
          <option value="all">All stages</option>
          <option value="open">Open only</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <input
          className="input w-32"
          type="number"
          placeholder="Min value (₹)"
          value={minValue}
          onChange={(e) => setMinValue(e.target.value)}
        />
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[12px] text-muted">
            {filtered.length} · Total {formatMoney(totalValue)}
          </span>
          <ColumnPicker storageKey="opportunities-list" columns={columns} />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto" data-col-scope="opportunities-list">
        <table className="tbl">
          <thead>
            <tr>
              <th data-col="name">Opportunity</th>
              <th data-col="company">Company</th>
              <th
                data-col="value"
                className="cursor-pointer select-none"
                onClick={() => toggleSort("value")}
              >
                Value {sortKey === "value" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </th>
              <th data-col="stage">Stage</th>
              <th data-col="contact">Contact</th>
              <th data-col="owner">Owner</th>
              <th data-col="lastTouch">Last touchpoint</th>
              <th
                data-col="updated"
                className="cursor-pointer select-none"
                onClick={() => toggleSort("updated")}
              >
                Updated{" "}
                {sortKey === "updated" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const stage = stageById.get(r.stageId);
              return (
                <tr key={r.id}>
                  <td data-col="name">
                    <Link
                      href={`/app/opportunities/${r.id}`}
                      className="font-medium text-accent hover:underline"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td data-col="company">
                    <Link
                      href={`/app/leads/${r.leadId}`}
                      className="hover:underline"
                    >
                      {r.leadName}
                    </Link>
                  </td>
                  <td data-col="value" className="font-semibold">
                    {Number(r.value) > 0 ? formatMoney(r.value) : "—"}
                  </td>
                  <td data-col="stage">
                    <span
                      className={
                        "badge " +
                        (stage?.isWon
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : stage?.isLost
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-amber-50 text-amber-700 border-amber-200")
                      }
                    >
                      {stage?.name ?? "—"}
                    </span>
                  </td>
                  <td data-col="contact">{r.contactName ?? "—"}</td>
                  <td data-col="owner" className="text-muted">
                    {r.ownerEmail ?? "—"}
                  </td>
                  <td data-col="lastTouch" className="text-muted">
                    {r.lastTouchpointAt
                      ? new Date(r.lastTouchpointAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td data-col="updated" className="text-muted">
                    {new Date(r.updatedAt).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-muted py-10">
                  No opportunities match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
