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
  { key: "LEAD_STATUS_CHANGED", label: "Lead status changes", icon: Target, conditionField: "status" },
  { key: "LEAD_CREATED", label: "Lead is created", icon: Target, conditionField: null },
  { key: "OPPORTUNITY_STAGE_CHANGED", label: "Opportunity stage changes", icon: Trophy, conditionField: "stageName" },
  { key: "OPPORTUNITY_CREATED", label: "Opportunity is created", icon: Trophy, conditionField: null },
];

const LEAD_STATUSES = ["POTENTIAL", "QUALIFIED", "INTERESTED", "CUSTOMER", "BAD_FIT", "CHURNED"];

const ACTION_TYPES = [
  { key: "CREATE_TASK", label: "Create a task", icon: CheckSquare },
  { key: "SEND_SLACK", label: "Send Slack message", icon: MessageSquare },
];

function triggerLabel(t: Trigger): string {
  const def = TRIGGER_EVENTS.find((e) => e.key === t.event);
  let label = def?.label ?? t.event;
  if (t.conditions) {
    const vals = Object.entries(t.conditions)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k} = ${v.replace("_", " ")}`)
      .join(", ");
    if (vals) label += ` (${vals})`;
  }
  return label;
}

function actionLabel(a: Action): string {
  const def = ACTION_TYPES.find((at) => at.key === a.type);
  if (a.type === "CREATE_TASK") {
    return `Create task: "${a.config.title}" (${a.config.priority ?? "HIGH"}, due in ${a.config.dueInHours ?? 24}h)`;
  }
  if (a.type === "SEND_SLACK") {
    return `Slack: "${String(a.config.message ?? "").slice(0, 60)}"`;
  }
  return def?.label ?? a.type;
}

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

  // New workflow form
  const [name, setName] = useState("");
  const [triggerEvent, setTriggerEvent] = useState("LEAD_STATUS_CHANGED");
  const [conditionValue, setConditionValue] = useState("");
  const [actionType, setActionType] = useState("CREATE_TASK");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState("HIGH");
  const [taskDueHours, setTaskDueHours] = useState("24");
  const [taskAssignOwner, setTaskAssignOwner] = useState(true);
  const [slackMessage, setSlackMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedTrigger = TRIGGER_EVENTS.find((e) => e.key === triggerEvent);

  function resetForm() {
    setName("");
    setTriggerEvent("LEAD_STATUS_CHANGED");
    setConditionValue("");
    setActionType("CREATE_TASK");
    setTaskTitle("");
    setTaskPriority("HIGH");
    setTaskDueHours("24");
    setTaskAssignOwner(true);
    setSlackMessage("");
  }

  async function create() {
    if (!name.trim()) return toast.error("Name is required");
    if (actionType === "CREATE_TASK" && !taskTitle.trim())
      return toast.error("Task title is required");
    if (actionType === "SEND_SLACK" && !slackMessage.trim())
      return toast.error("Slack message is required");

    const trigger: Trigger = {
      event: triggerEvent,
      conditions: conditionValue && selectedTrigger?.conditionField
        ? { [selectedTrigger.conditionField]: conditionValue }
        : undefined,
    };

    const action: Action =
      actionType === "CREATE_TASK"
        ? {
            type: "CREATE_TASK",
            config: {
              title: taskTitle.trim(),
              priority: taskPriority,
              dueInHours: Number(taskDueHours) || 24,
              assignToOwner: taskAssignOwner,
            },
          }
        : {
            type: "SEND_SLACK",
            config: { message: slackMessage.trim() },
          };

    setSaving(true);
    try {
      const res = await fetch("/api/internal/workflows", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          trigger,
          actions: [action],
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
            Automate internal actions when leads or opportunities change
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
            Create a workflow to automate actions like creating tasks when a lead
            is marked as qualified.
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
                  <span className="font-medium">When:</span> {triggerLabel(w.trigger)}
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

      {/* Composer modal */}
      {composerOpen && (
        <div className="modal-overlay" onClick={() => setComposerOpen(false)}>
          <div
            className="modal-card w-full max-w-lg p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Zap size={18} className="text-amber-500" />
                New Workflow
              </h2>
              <button
                className="size-7 grid place-items-center rounded text-muted hover:bg-surface"
                onClick={() => {
                  setComposerOpen(false);
                  resetForm();
                }}
              >
                <X size={16} />
              </button>
            </div>

            <label className="block">
              <span className="label">Workflow name</span>
              <input
                autoFocus
                className="input mt-1"
                placeholder="e.g. Follow up on qualified leads"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>

            {/* Trigger */}
            <div className="space-y-2">
              <span className="label">When</span>
              <select
                className="input"
                value={triggerEvent}
                onChange={(e) => {
                  setTriggerEvent(e.target.value);
                  setConditionValue("");
                }}
              >
                {TRIGGER_EVENTS.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>

              {/* Condition value */}
              {selectedTrigger?.conditionField === "status" && (
                <div>
                  <span className="label">to status</span>
                  <select
                    className="input mt-1"
                    value={conditionValue}
                    onChange={(e) => setConditionValue(e.target.value)}
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
              {selectedTrigger?.conditionField === "stageName" && (
                <div>
                  <span className="label">to stage</span>
                  <select
                    className="input mt-1"
                    value={conditionValue}
                    onChange={(e) => setConditionValue(e.target.value)}
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

            {/* Action */}
            <div className="space-y-2">
              <span className="label">Then</span>
              <select
                className="input"
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
              >
                {ACTION_TYPES.map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.label}
                  </option>
                ))}
              </select>

              {actionType === "CREATE_TASK" && (
                <div className="space-y-2 pl-3 border-l-2 border-accent/20">
                  <label className="block">
                    <span className="label">Task title</span>
                    <input
                      className="input mt-1"
                      placeholder="e.g. Call the lead"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                    />
                    <p className="text-[10px] text-mutedSoft mt-1">
                      Use {"{{status}}"} or {"{{stageName}}"} for dynamic values
                    </p>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="label">Priority</span>
                      <select
                        className="input mt-1"
                        value={taskPriority}
                        onChange={(e) => setTaskPriority(e.target.value)}
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
                        value={taskDueHours}
                        onChange={(e) => setTaskDueHours(e.target.value)}
                      />
                    </label>
                  </div>
                  <label className="flex items-center gap-2 text-[13px]">
                    <input
                      type="checkbox"
                      checked={taskAssignOwner}
                      onChange={(e) => setTaskAssignOwner(e.target.checked)}
                    />
                    Assign task to lead/opportunity owner
                  </label>
                </div>
              )}

              {actionType === "SEND_SLACK" && (
                <div className="pl-3 border-l-2 border-accent/20">
                  <label className="block">
                    <span className="label">Message</span>
                    <textarea
                      className="input mt-1 min-h-[60px]"
                      placeholder="e.g. Lead {{leadId}} was marked as {{status}}"
                      value={slackMessage}
                      onChange={(e) => setSlackMessage(e.target.value)}
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                className="btn"
                onClick={() => {
                  setComposerOpen(false);
                  resetForm();
                }}
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
