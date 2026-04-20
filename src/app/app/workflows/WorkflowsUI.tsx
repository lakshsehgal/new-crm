"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Zap,
  Trash2,
  X,
  Power,
  PowerOff,
  Target,
  Trophy,
  CheckSquare,
  MessageSquare,
  ArrowDown,
  Activity,
  Users,
  RefreshCw,
} from "lucide-react";

type Trigger = {
  event: string;
  conditions?: Record<string, string>;
};

type Action = {
  type: string;
  config: Record<string, unknown>;
};

type Workflow = {
  id: string;
  name: string;
  active: boolean;
  trigger: Trigger;
  actions: Action[];
  updatedAt: string;
};

const TRIGGER_EVENTS = [
  {
    key: "ACTIVITY_CREATED",
    label: "Activity / ticket is created",
    icon: Activity,
    conditionFields: ["activityType", "titleContains"],
  },
  {
    key: "LEAD_STATUS_CHANGED",
    label: "Lead status changes",
    icon: Target,
    conditionFields: ["status"],
  },
  {
    key: "LEAD_CREATED",
    label: "Lead is created",
    icon: Target,
    conditionFields: [],
  },
  {
    key: "OPPORTUNITY_STAGE_CHANGED",
    label: "Opportunity stage changes",
    icon: Trophy,
    conditionFields: ["stageName"],
  },
  {
    key: "OPPORTUNITY_CREATED",
    label: "Opportunity is created",
    icon: Trophy,
    conditionFields: [],
  },
  {
    key: "CONTACT_CREATED",
    label: "Contact is created",
    icon: Users,
    conditionFields: [],
  },
];

const LEAD_STATUSES = [
  "POTENTIAL",
  "QUALIFIED",
  "INTERESTED",
  "CUSTOMER",
  "BAD_FIT",
  "CHURNED",
];

const ACTIVITY_TYPES = ["NOTE", "CALL", "MEETING", "TASK", "EMAIL"];

const ACTION_TYPES = [
  { key: "SEND_SLACK", label: "Send Slack message", icon: MessageSquare },
  { key: "CREATE_TASK", label: "Create a task", icon: CheckSquare },
  { key: "UPDATE_STATUS", label: "Update lead status", icon: RefreshCw },
];

function triggerLabel(t: Trigger): string {
  const def = TRIGGER_EVENTS.find((e) => e.key === t.event);
  let label = def?.label ?? t.event;
  if (t.conditions) {
    const parts: string[] = [];
    if (t.conditions.activityType) parts.push(`type = ${t.conditions.activityType}`);
    if (t.conditions.titleContains) parts.push(`title contains "${t.conditions.titleContains}"`);
    if (t.conditions.status) parts.push(`status = ${t.conditions.status.replace("_", " ")}`);
    if (t.conditions.stageName) parts.push(`stage = ${t.conditions.stageName}`);
    if (parts.length) label += ` (${parts.join(", ")})`;
  }
  return label;
}

function actionLabel(a: Action): string {
  if (a.type === "CREATE_TASK") {
    return `Create task: "${a.config.title}" (${a.config.priority ?? "HIGH"}, due in ${a.config.dueInHours ?? 24}h)`;
  }
  if (a.type === "SEND_SLACK") {
    const msg = String(a.config.message ?? "").slice(0, 50);
    return `Slack: "${msg}${msg.length >= 50 ? "…" : ""}"`;
  }
  if (a.type === "UPDATE_STATUS") {
    return `Update status → ${String(a.config.status ?? "").replace("_", " ")}`;
  }
  return a.type;
}

const EMPTY_ACTION: Action = { type: "SEND_SLACK", config: { message: "" } };

export default function WorkflowsUI({
  workflows: initial,
  stageNames,
}: {
  workflows: Workflow[];
  stageNames: string[];
}) {
  const [workflows, setWorkflows] = useState(initial);
  const [composerOpen, setComposerOpen] = useState(false);
  const router = useRouter();

  // Form state
  const [name, setName] = useState("");
  const [triggerEvent, setTriggerEvent] = useState("ACTIVITY_CREATED");
  const [conditions, setConditions] = useState<Record<string, string>>({});
  const [actions, setActions] = useState<Action[]>([
    { type: "SEND_SLACK", config: { message: "" } },
  ]);
  const [saving, setSaving] = useState(false);

  const selectedTrigger = TRIGGER_EVENTS.find((e) => e.key === triggerEvent);

  function resetForm() {
    setName("");
    setTriggerEvent("ACTIVITY_CREATED");
    setConditions({});
    setActions([{ type: "SEND_SLACK", config: { message: "" } }]);
  }

  function updateAction(idx: number, updates: Partial<Action>) {
    setActions((prev) =>
      prev.map((a, i) => {
        if (i !== idx) return a;
        if (updates.type && updates.type !== a.type) {
          return { type: updates.type, config: {} };
        }
        return { ...a, ...updates, config: { ...a.config, ...updates.config } };
      }),
    );
  }

  function updateActionConfig(idx: number, key: string, value: unknown) {
    setActions((prev) =>
      prev.map((a, i) =>
        i === idx ? { ...a, config: { ...a.config, [key]: value } } : a,
      ),
    );
  }

  function removeAction(idx: number) {
    setActions((prev) => prev.filter((_, i) => i !== idx));
  }

  function validateActions(): boolean {
    for (const a of actions) {
      if (a.type === "SEND_SLACK" && !String(a.config.message ?? "").trim()) {
        toast.error("Slack message is required");
        return false;
      }
      if (a.type === "CREATE_TASK" && !String(a.config.title ?? "").trim()) {
        toast.error("Task title is required");
        return false;
      }
      if (a.type === "UPDATE_STATUS" && !String(a.config.status ?? "").trim()) {
        toast.error("Target status is required");
        return false;
      }
    }
    return true;
  }

  async function create() {
    if (!name.trim()) return toast.error("Name is required");
    if (actions.length === 0) return toast.error("Add at least one action");
    if (!validateActions()) return;

    const cleanConditions: Record<string, string> = {};
    for (const [k, v] of Object.entries(conditions)) {
      if (v) cleanConditions[k] = v;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/internal/workflows", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          trigger: {
            event: triggerEvent,
            conditions: Object.keys(cleanConditions).length
              ? cleanConditions
              : undefined,
          },
          actions,
        }),
      });
      if (!res.ok) return toast.error("Failed to create workflow");
      toast.success("Workflow created");
      setComposerOpen(false);
      resetForm();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    setWorkflows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, active: !active } : w)),
    );
    await fetch(`/api/internal/workflows/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this workflow?")) return;
    setWorkflows((prev) => prev.filter((w) => w.id !== id));
    await fetch(`/api/internal/workflows/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="p-6 space-y-4 fade-in">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Workflows</h1>
          <p className="text-sm text-muted">
            Automate internal actions when CRM events happen
          </p>
        </div>
        <button className="btn-primary" onClick={() => setComposerOpen(true)}>
          <Plus size={14} /> New workflow
        </button>
      </header>

      {workflows.length === 0 && !composerOpen ? (
        <div className="card p-8 text-center text-muted">
          <Zap size={32} className="mx-auto mb-3 text-mutedSoft" />
          <p className="text-sm font-medium">No workflows yet</p>
          <p className="text-[13px] mt-1">
            Automate Slack alerts, task creation, and status changes.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {workflows.map((w) => (
            <div
              key={w.id}
              className={
                "card px-4 py-3 flex items-center gap-3 group " +
                (!w.active ? "opacity-60" : "")
              }
            >
              <div
                className={
                  "size-8 rounded-md grid place-items-center flex-shrink-0 " +
                  (w.active
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-gray-100 text-gray-400")
                }
              >
                <Zap size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{w.name}</div>
                <div className="text-[11px] text-muted mt-0.5">
                  <span className="font-medium">When:</span>{" "}
                  {triggerLabel(w.trigger)}
                </div>
                <div className="text-[11px] text-muted">
                  <span className="font-medium">Then:</span>{" "}
                  {w.actions.map(actionLabel).join(" → ")}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => toggleActive(w.id, w.active)}
                  className="size-7 grid place-items-center rounded text-muted hover:bg-surface hover:text-ink"
                  title={w.active ? "Disable" : "Enable"}
                >
                  {w.active ? <PowerOff size={13} /> : <Power size={13} />}
                </button>
                <button
                  onClick={() => remove(w.id)}
                  className="size-7 grid place-items-center rounded text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---- Workflow Builder Modal ---- */}
      {composerOpen && (
        <div className="modal-overlay" onClick={() => setComposerOpen(false)}>
          <div
            className="modal-card w-full max-w-xl p-0 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-xl">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Zap size={18} className="text-amber-500" />
                Workflow Builder
              </h2>
              <button
                className="size-7 grid place-items-center rounded text-muted hover:bg-surface"
                onClick={() => { setComposerOpen(false); resetForm(); }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Name */}
              <label className="block">
                <span className="label">Workflow name</span>
                <input
                  autoFocus
                  className="input mt-1"
                  placeholder="e.g. Alert on creative ticket"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>

              {/* ---- Step 1: TRIGGER ---- */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-3">
                <div className="flex items-center gap-2 text-amber-700">
                  <Zap size={14} />
                  <span className="text-[12px] font-bold uppercase tracking-wide">
                    Trigger — When
                  </span>
                </div>

                <select
                  className="input"
                  value={triggerEvent}
                  onChange={(e) => {
                    setTriggerEvent(e.target.value);
                    setConditions({});
                  }}
                >
                  {TRIGGER_EVENTS.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </select>

                {/* Conditions */}
                {selectedTrigger?.conditionFields.includes("activityType") && (
                  <div>
                    <span className="label">Activity type (optional)</span>
                    <select
                      className="input mt-1"
                      value={conditions.activityType ?? ""}
                      onChange={(e) =>
                        setConditions((p) => ({ ...p, activityType: e.target.value }))
                      }
                    >
                      <option value="">Any type</option>
                      {ACTIVITY_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedTrigger?.conditionFields.includes("titleContains") && (
                  <div>
                    <span className="label">Title contains (optional)</span>
                    <input
                      className="input mt-1"
                      placeholder='e.g. "creative ticket"'
                      value={conditions.titleContains ?? ""}
                      onChange={(e) =>
                        setConditions((p) => ({
                          ...p,
                          titleContains: e.target.value,
                        }))
                      }
                    />
                  </div>
                )}

                {selectedTrigger?.conditionFields.includes("status") && (
                  <div>
                    <span className="label">To status</span>
                    <select
                      className="input mt-1"
                      value={conditions.status ?? ""}
                      onChange={(e) =>
                        setConditions((p) => ({ ...p, status: e.target.value }))
                      }
                    >
                      <option value="">Any status</option>
                      {LEAD_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedTrigger?.conditionFields.includes("stageName") && (
                  <div>
                    <span className="label">To stage</span>
                    <select
                      className="input mt-1"
                      value={conditions.stageName ?? ""}
                      onChange={(e) =>
                        setConditions((p) => ({
                          ...p,
                          stageName: e.target.value,
                        }))
                      }
                    >
                      <option value="">Any stage</option>
                      {stageNames.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Connector arrow */}
              <div className="flex justify-center text-muted">
                <ArrowDown size={20} />
              </div>

              {/* ---- Step 2: ACTIONS ---- */}
              <div className="space-y-3">
                {actions.map((action, idx) => (
                  <div key={idx}>
                    {idx > 0 && (
                      <div className="flex justify-center text-muted py-1">
                        <ArrowDown size={16} />
                      </div>
                    )}
                    <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3 relative">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-blue-700">
                          <CheckSquare size={14} />
                          <span className="text-[12px] font-bold uppercase tracking-wide">
                            Action {actions.length > 1 ? idx + 1 : ""}— Then
                          </span>
                        </div>
                        {actions.length > 1 && (
                          <button
                            onClick={() => removeAction(idx)}
                            className="size-6 grid place-items-center rounded text-rose-400 hover:bg-rose-50"
                            title="Remove action"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>

                      <select
                        className="input"
                        value={action.type}
                        onChange={(e) =>
                          updateAction(idx, { type: e.target.value })
                        }
                      >
                        {ACTION_TYPES.map((a) => (
                          <option key={a.key} value={a.key}>
                            {a.label}
                          </option>
                        ))}
                      </select>

                      {/* SEND_SLACK config */}
                      {action.type === "SEND_SLACK" && (
                        <div className="space-y-2">
                          <label className="block">
                            <span className="label">Message</span>
                            <textarea
                              className="input mt-1 min-h-[60px]"
                              placeholder={'e.g. :rotating_light: New creative ticket: "{{activityTitle}}" on lead {{leadName}}'}
                              value={String(action.config.message ?? "")}
                              onChange={(e) =>
                                updateActionConfig(idx, "message", e.target.value)
                              }
                            />
                            <p className="text-[10px] text-mutedSoft mt-1">
                              Variables: {"{{activityTitle}}"}, {"{{activityType}}"},{" "}
                              {"{{leadName}}"}, {"{{oppName}}"}, {"{{status}}"},{" "}
                              {"{{stageName}}"}
                            </p>
                          </label>
                          <label className="block">
                            <span className="label">
                              Slack webhook URL (optional — overrides global)
                            </span>
                            <input
                              className="input mt-1"
                              placeholder="https://hooks.slack.com/services/..."
                              value={String(action.config.webhookUrl ?? "")}
                              onChange={(e) =>
                                updateActionConfig(
                                  idx,
                                  "webhookUrl",
                                  e.target.value,
                                )
                              }
                            />
                            <p className="text-[10px] text-mutedSoft mt-1">
                              Leave empty to use the default SLACK_WEBHOOK_URL.
                              Set a different URL to send to a specific channel.
                            </p>
                          </label>
                        </div>
                      )}

                      {/* CREATE_TASK config */}
                      {action.type === "CREATE_TASK" && (
                        <div className="space-y-2">
                          <label className="block">
                            <span className="label">Task title</span>
                            <input
                              className="input mt-1"
                              placeholder="e.g. Review creative for {{leadName}}"
                              value={String(action.config.title ?? "")}
                              onChange={(e) =>
                                updateActionConfig(idx, "title", e.target.value)
                              }
                            />
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <label className="block">
                              <span className="label">Priority</span>
                              <select
                                className="input mt-1"
                                value={String(action.config.priority ?? "HIGH")}
                                onChange={(e) =>
                                  updateActionConfig(
                                    idx,
                                    "priority",
                                    e.target.value,
                                  )
                                }
                              >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                                <option value="URGENT">Urgent</option>
                              </select>
                            </label>
                            <label className="block">
                              <span className="label">Due in (hours)</span>
                              <input
                                type="number"
                                className="input mt-1"
                                value={String(action.config.dueInHours ?? "24")}
                                onChange={(e) =>
                                  updateActionConfig(
                                    idx,
                                    "dueInHours",
                                    Number(e.target.value) || 24,
                                  )
                                }
                              />
                            </label>
                          </div>
                          <label className="flex items-center gap-2 text-[13px]">
                            <input
                              type="checkbox"
                              checked={!!action.config.assignToOwner}
                              onChange={(e) =>
                                updateActionConfig(
                                  idx,
                                  "assignToOwner",
                                  e.target.checked,
                                )
                              }
                            />
                            Assign to lead/opportunity owner
                          </label>
                        </div>
                      )}

                      {/* UPDATE_STATUS config */}
                      {action.type === "UPDATE_STATUS" && (
                        <div>
                          <span className="label">Set status to</span>
                          <select
                            className="input mt-1"
                            value={String(action.config.status ?? "")}
                            onChange={(e) =>
                              updateActionConfig(idx, "status", e.target.value)
                            }
                          >
                            <option value="">Select…</option>
                            {LEAD_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s.replace("_", " ")}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Add action button */}
                <button
                  className="btn w-full justify-center text-[13px]"
                  onClick={() => setActions((p) => [...p, { ...EMPTY_ACTION }])}
                >
                  <Plus size={13} /> Add another action
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-border flex justify-end gap-2 sticky bottom-0 bg-white rounded-b-xl">
              <button
                className="btn"
                onClick={() => { setComposerOpen(false); resetForm(); }}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={create}
                disabled={saving}
              >
                {saving ? "Creating…" : "Create workflow"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
