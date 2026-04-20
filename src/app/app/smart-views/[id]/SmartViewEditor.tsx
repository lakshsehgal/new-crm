"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { formatMoney } from "@/lib/utils";
import {
  ArrowLeft,
  Filter,
  Pin,
  PinOff,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";

type Condition = {
  field: string;
  operator: string;
  value?: unknown;
};

type Filters = {
  match: "all" | "any";
  conditions: Condition[];
};

type SmartView = {
  id: string;
  name: string;
  entity: string;
  filters: Filters;
  pinned: boolean;
} | null;

type CustomField = {
  key: string;
  label: string;
  type: string;
  options: unknown;
};

type LeadRow = {
  id: string;
  name: string;
  status: string;
  url: string | null;
  customData: Record<string, unknown>;
  updatedAt: string;
  contacts: { id: string; firstName: string | null; lastName: string | null; email: string | null; phone: string | null }[];
  opportunities: { id: string; value: string | number }[];
  owner: { email: string } | null;
};

// Standard lead fields
const LEAD_FIELDS = [
  { key: "name", label: "Name", type: "text" },
  { key: "status", label: "Status", type: "enum", options: ["POTENTIAL", "QUALIFIED", "INTERESTED", "CUSTOMER", "BAD_FIT", "CHURNED"] },
  { key: "source", label: "Source", type: "enum", options: ["MANUAL", "API"] },
  { key: "url", label: "URL", type: "text" },
  { key: "description", label: "Description", type: "text" },
  { key: "address", label: "Address", type: "text" },
  { key: "createdAt", label: "Date created", type: "date" },
  { key: "updatedAt", label: "Date updated", type: "date" },
  { key: "hasOpenTasks", label: "Has open tasks", type: "enum", options: ["yes", "no"] },
  { key: "hasOverdueTasks", label: "Has overdue tasks", type: "enum", options: ["yes", "no"] },
];

const TEXT_OPERATORS = [
  { key: "contains", label: "contains" },
  { key: "not_contains", label: "does not contain" },
  { key: "eq", label: "equals" },
  { key: "neq", label: "does not equal" },
  { key: "starts_with", label: "starts with" },
  { key: "ends_with", label: "ends with" },
  { key: "present", label: "is present" },
  { key: "not_present", label: "is not present" },
];

const ENUM_OPERATORS = [
  { key: "eq", label: "is" },
  { key: "neq", label: "is not" },
];

const DATE_OPERATORS = [
  { key: "eq", label: "is" },
  { key: "gt", label: "is after" },
  { key: "lt", label: "is before" },
  { key: "gte", label: "is on or after" },
  { key: "lte", label: "is on or before" },
];

const statusStyles: Record<string, string> = {
  POTENTIAL: "bg-amber-50 text-amber-700 border-amber-200",
  INTERESTED: "bg-violet-50 text-violet-700 border-violet-200",
  QUALIFIED: "bg-blue-50 text-blue-700 border-blue-200",
  CUSTOMER: "bg-emerald-50 text-emerald-700 border-emerald-200",
  BAD_FIT: "bg-rose-50 text-rose-700 border-rose-200",
  CHURNED: "bg-gray-100 text-gray-600 border-gray-200",
};

function getOperators(fieldType: string) {
  if (fieldType === "enum") return ENUM_OPERATORS;
  if (fieldType === "date") return DATE_OPERATORS;
  return TEXT_OPERATORS;
}

function needsValue(operator: string) {
  return operator !== "present" && operator !== "not_present";
}

export default function SmartViewEditor({
  view,
  customFields,
}: {
  view: SmartView;
  customFields: CustomField[];
}) {
  const router = useRouter();
  const isNew = view === null;

  const [name, setName] = useState(view?.name ?? "");
  const [match, setMatch] = useState<"all" | "any">(view?.filters?.match ?? "all");
  const [conditions, setConditions] = useState<Condition[]>(
    view?.filters?.conditions ?? [],
  );
  const [pinned, setPinned] = useState(view?.pinned ?? false);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState<LeadRow[] | null>(null);
  const [searching, setSearching] = useState(false);

  // Build the full field list = standard fields + custom fields
  const allFields = [
    ...LEAD_FIELDS,
    ...customFields.map((f) => ({
      key: `customData.${f.key}`,
      label: f.label,
      type: f.type === "SELECT" ? "enum" : f.type === "DATE" ? "date" : "text",
      options: f.type === "SELECT" && f.options ? (f.options as any)?.options ?? [] : undefined,
    })),
  ];

  function getField(key: string) {
    return allFields.find((f) => f.key === key);
  }

  // Auto-load results for existing views
  useEffect(() => {
    if (!isNew && conditions.length > 0) {
      preview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addCondition() {
    setConditions((prev) => [
      ...prev,
      { field: "name", operator: "contains", value: "" },
    ]);
  }

  function updateCondition(idx: number, updates: Partial<Condition>) {
    setConditions((prev) =>
      prev.map((c, i) => {
        if (i !== idx) return c;
        const next = { ...c, ...updates };
        // Reset operator + value when field changes
        if (updates.field && updates.field !== c.field) {
          const fieldDef = getField(updates.field);
          const ops = getOperators(fieldDef?.type ?? "text");
          next.operator = ops[0]?.key ?? "contains";
          next.value = "";
        }
        return next;
      }),
    );
  }

  function removeCondition(idx: number) {
    setConditions((prev) => prev.filter((_, i) => i !== idx));
  }

  const preview = useCallback(async () => {
    setSearching(true);
    try {
      const res = await fetch("/api/internal/smart-views/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          entity: "LEAD",
          filters: { match, conditions },
        }),
      });
      if (!res.ok) {
        toast.error("Failed to load results");
        return;
      }
      const json = await res.json();
      setResults(json.data);
    } finally {
      setSearching(false);
    }
  }, [match, conditions]);

  async function save() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        entity: "LEAD",
        filters: { match, conditions },
        pinned,
      };
      const res = isNew
        ? await fetch("/api/internal/smart-views", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch(`/api/internal/smart-views/${view.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          });
      if (!res.ok) {
        toast.error("Failed to save");
        return;
      }
      const saved = await res.json();
      toast.success(isNew ? "Smart view created" : "Smart view updated");
      router.push(`/app/smart-views/${saved.id}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full fade-in">
      {/* Header */}
      <div className="h-14 border-b border-border px-5 flex items-center gap-3 bg-white flex-shrink-0">
        <button
          onClick={() => router.push("/app/smart-views")}
          className="size-7 grid place-items-center rounded-md text-muted hover:bg-surface hover:text-ink"
          title="Back"
        >
          <ArrowLeft size={16} />
        </button>
        <Filter size={16} className="text-indigo-500" />
        <input
          className="font-semibold text-lg bg-transparent outline-none flex-1 min-w-0"
          placeholder="Smart view name…"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          onClick={() => setPinned((p) => !p)}
          className={`btn-ghost ${pinned ? "text-amber-500" : ""}`}
          title={pinned ? "Unpin from sidebar" : "Pin to sidebar"}
        >
          {pinned ? <PinOff size={14} /> : <Pin size={14} />}
          {pinned ? "Pinned" : "Pin"}
        </button>
        <button onClick={save} disabled={saving} className="btn-primary">
          <Save size={14} /> {isNew ? "Save" : "Update"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Filter builder */}
        <div className="px-6 py-4 border-b border-border bg-surface/50">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[13px] font-semibold">Find Leads matching</span>
            <select
              className="pill !py-0.5 !px-2 !text-[12px] cursor-pointer"
              value={match}
              onChange={(e) => setMatch(e.target.value as "all" | "any")}
            >
              <option value="all">all of</option>
              <option value="any">any of</option>
            </select>
            <span className="text-[13px] text-muted">the following conditions:</span>
          </div>

          {/* Conditions */}
          <div className="space-y-2">
            {conditions.map((cond, idx) => {
              const fieldDef = getField(cond.field);
              const operators = getOperators(fieldDef?.type ?? "text");
              const showValue = needsValue(cond.operator);
              const isEnum = fieldDef?.type === "enum";
              const isDate = fieldDef?.type === "date";

              return (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-white rounded-lg border border-border px-3 py-2 pop-in"
                >
                  {idx > 0 && (
                    <span className="badge !text-[10px] !px-1.5 !py-0 mr-1">
                      {match === "all" ? "AND" : "OR"}
                    </span>
                  )}

                  {/* Field select */}
                  <select
                    className="input !w-auto !py-1 !text-[13px] min-w-[160px]"
                    value={cond.field}
                    onChange={(e) =>
                      updateCondition(idx, { field: e.target.value })
                    }
                  >
                    <optgroup label="Standard fields">
                      {LEAD_FIELDS.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label}
                        </option>
                      ))}
                    </optgroup>
                    {customFields.length > 0 && (
                      <optgroup label="Custom fields">
                        {customFields.map((f) => (
                          <option key={f.key} value={`customData.${f.key}`}>
                            {f.label}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>

                  {/* Operator select */}
                  <select
                    className="input !w-auto !py-1 !text-[13px] min-w-[140px]"
                    value={cond.operator}
                    onChange={(e) =>
                      updateCondition(idx, { operator: e.target.value })
                    }
                  >
                    {operators.map((op) => (
                      <option key={op.key} value={op.key}>
                        {op.label}
                      </option>
                    ))}
                  </select>

                  {/* Value input */}
                  {showValue &&
                    (isEnum ? (
                      <select
                        className="input !w-auto !py-1 !text-[13px] min-w-[160px]"
                        value={String(cond.value ?? "")}
                        onChange={(e) =>
                          updateCondition(idx, { value: e.target.value })
                        }
                      >
                        <option value="">Select…</option>
                        {(fieldDef?.options ?? []).map((o: string) => (
                          <option key={o} value={o}>
                            {o.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    ) : isDate ? (
                      <input
                        type="date"
                        className="input !w-auto !py-1 !text-[13px]"
                        value={String(cond.value ?? "")}
                        onChange={(e) =>
                          updateCondition(idx, { value: e.target.value })
                        }
                      />
                    ) : (
                      <input
                        type="text"
                        className="input !py-1 !text-[13px] flex-1 min-w-[180px]"
                        placeholder="Value…"
                        value={String(cond.value ?? "")}
                        onChange={(e) =>
                          updateCondition(idx, { value: e.target.value })
                        }
                      />
                    ))}

                  <button
                    onClick={() => removeCondition(idx)}
                    className="size-6 grid place-items-center rounded text-mutedSoft hover:bg-rose-50 hover:text-rose-500 flex-shrink-0"
                    title="Remove filter"
                  >
                    <X size={13} />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 mt-3">
            <button onClick={addCondition} className="btn text-[13px]">
              <Plus size={13} /> Add filter
            </button>
            <button
              onClick={preview}
              disabled={searching}
              className="btn-primary text-[13px]"
            >
              <Search size={13} />{" "}
              {searching ? "Searching…" : "Apply filters"}
            </button>
            {results !== null && (
              <span className="text-[13px] text-muted ml-2">
                {results.length} lead{results.length !== 1 ? "s" : ""} found
              </span>
            )}
          </div>
        </div>

        {/* Results table */}
        {results !== null && (
          <div className="p-6">
            {results.length === 0 ? (
              <div className="card p-8 text-center text-muted text-sm">
                No leads match these filters.
              </div>
            ) : (
              <div className="card overflow-hidden">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Company</th>
                      <th>Status</th>
                      <th>Contacts</th>
                      <th>Pipeline value</th>
                      <th>Owner</th>
                      <th>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((l, idx) => {
                      const pipelineVal = l.opportunities.reduce(
                        (s, o) => s + Number(o.value ?? 0),
                        0,
                      );
                      const primaryContact = l.contacts[0];
                      const contactName = primaryContact
                        ? [primaryContact.firstName, primaryContact.lastName]
                            .filter(Boolean)
                            .join(" ") || primaryContact.email
                        : null;
                      return (
                        <tr key={l.id}>
                          <td className="text-mutedSoft text-[12px]">
                            {idx + 1}
                          </td>
                          <td>
                            <Link
                              href={`/app/leads/${l.id}`}
                              className="font-medium text-accent hover:underline"
                            >
                              {l.name}
                            </Link>
                          </td>
                          <td>
                            <span
                              className={`badge ${statusStyles[l.status] ?? ""}`}
                            >
                              {l.status.replace("_", " ")}
                            </span>
                          </td>
                          <td>
                            {contactName ? (
                              <div>
                                <div className="text-sm">{contactName}</div>
                                {primaryContact?.email && (
                                  <div className="text-[11px] text-muted">
                                    {primaryContact.email}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td>
                            {pipelineVal > 0
                              ? formatMoney(pipelineVal)
                              : "—"}
                          </td>
                          <td className="text-muted">
                            {l.owner?.email ?? "—"}
                          </td>
                          <td className="text-muted">
                            {new Date(l.updatedAt).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
