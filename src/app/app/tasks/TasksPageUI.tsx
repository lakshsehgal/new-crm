"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Plus,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Clock,
  Target,
  Trophy,
  Trash2,
  X,
  Bell,
  BellOff,
} from "lucide-react";

type Task = {
  id: string;
  title: string;
  body: string | null;
  priority: string;
  dueAt: string | null;
  completedAt: string | null;
  reminderAt: string | null;
  reminded: boolean;
  assignee: { id: string; name: string | null; email: string } | null;
  createdBy: { id: string; name: string | null; email: string } | null;
  lead: { id: string; name: string } | null;
  opportunity: { id: string; name: string } | null;
  createdAt: string;
};

type UserRef = { id: string; name: string | null; email: string };
type EntityRef = { id: string; name: string };

const PRIORITY_CONFIG: Record<string, { label: string; style: string; icon: string }> = {
  URGENT: {
    label: "Urgent",
    style: "bg-red-50 text-red-700 border-red-200",
    icon: "!!",
  },
  HIGH: {
    label: "High",
    style: "bg-orange-50 text-orange-700 border-orange-200",
    icon: "!",
  },
  MEDIUM: {
    label: "Medium",
    style: "bg-blue-50 text-blue-700 border-blue-200",
    icon: "-",
  },
  LOW: {
    label: "Low",
    style: "bg-gray-50 text-gray-500 border-gray-200",
    icon: "...",
  },
};

type Filter = "all" | "mine" | "overdue" | "today" | "upcoming" | "completed";

function isOverdue(t: Task): boolean {
  return !t.completedAt && !!t.dueAt && new Date(t.dueAt) < new Date();
}

function isDueToday(t: Task): boolean {
  if (!t.dueAt || t.completedAt) return false;
  const due = new Date(t.dueAt);
  const now = new Date();
  return (
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate()
  );
}

function isDueUpcoming(t: Task): boolean {
  if (!t.dueAt || t.completedAt) return false;
  const due = new Date(t.dueAt);
  const now = new Date();
  const weekAhead = new Date(now);
  weekAhead.setDate(weekAhead.getDate() + 7);
  return due > now && due <= weekAhead;
}

function relDue(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.round(diff / 86400000);
  if (days < -1) return `${Math.abs(days)}d overdue`;
  if (days === -1) return "Yesterday";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days}d`;
}

export default function TasksPageUI({
  currentUserId,
  tasks: initialTasks,
  users,
  leads,
  opportunities,
}: {
  currentUserId: string;
  tasks: Task[];
  users: UserRef[];
  leads: EntityRef[];
  opportunities: EntityRef[];
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [filter, setFilter] = useState<Filter>("all");
  const [composerOpen, setComposerOpen] = useState(false);
  const router = useRouter();

  // New task form state
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [dueAt, setDueAt] = useState("");
  const [assigneeId, setAssigneeId] = useState(currentUserId);
  const [leadId, setLeadId] = useState("");
  const [opportunityId, setOpportunityId] = useState("");
  const [reminderAt, setReminderAt] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = tasks.filter((t) => {
    switch (filter) {
      case "mine":
        return t.assignee?.id === currentUserId && !t.completedAt;
      case "overdue":
        return isOverdue(t);
      case "today":
        return isDueToday(t);
      case "upcoming":
        return isDueUpcoming(t);
      case "completed":
        return !!t.completedAt;
      default:
        return !t.completedAt;
    }
  });

  const overdueCount = tasks.filter(isOverdue).length;

  async function createTask() {
    if (!title.trim()) return toast.error("Title is required");
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        type: "TASK",
        title: title.trim(),
        priority,
        assigneeId: assigneeId || undefined,
      };
      if (dueAt) body.dueAt = new Date(dueAt).toISOString();
      if (leadId) body.leadId = leadId;
      if (opportunityId) body.opportunityId = opportunityId;
      if (reminderAt) body.reminderAt = new Date(reminderAt).toISOString();

      const res = await fetch("/api/internal/activities", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) return toast.error("Failed to create task");
      toast.success("Task created");
      setTitle("");
      setPriority("MEDIUM");
      setDueAt("");
      setAssigneeId(currentUserId);
      setLeadId("");
      setOpportunityId("");
      setReminderAt("");
      setComposerOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function toggle(t: Task) {
    const next = !t.completedAt;
    setTasks((prev) =>
      prev.map((x) =>
        x.id === t.id
          ? { ...x, completedAt: next ? new Date().toISOString() : null }
          : x,
      ),
    );
    const res = await fetch(`/api/internal/activities/${t.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ completed: next }),
    });
    if (!res.ok) {
      toast.error("Failed");
      setTasks((prev) =>
        prev.map((x) => (x.id === t.id ? { ...x, completedAt: t.completedAt } : x)),
      );
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this task?")) return;
    setTasks((prev) => prev.filter((x) => x.id !== id));
    const res = await fetch(`/api/internal/activities/${id}`, { method: "DELETE" });
    if (!res.ok) toast.error("Failed");
    else router.refresh();
  }

  async function updatePriority(id: string, p: string) {
    setTasks((prev) =>
      prev.map((x) => (x.id === id ? { ...x, priority: p } : x)),
    );
    await fetch(`/api/internal/activities/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ priority: p }),
    });
  }

  const FILTERS: { key: Filter; label: string; count?: number }[] = [
    { key: "all", label: "Open" },
    { key: "mine", label: "My tasks" },
    { key: "overdue", label: "Overdue", count: overdueCount },
    { key: "today", label: "Today" },
    { key: "upcoming", label: "This week" },
    { key: "completed", label: "Completed" },
  ];

  return (
    <div className="p-6 space-y-4 fade-in">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Tasks</h1>
          <p className="text-sm text-muted">
            {overdueCount > 0 && (
              <span className="text-red-600 font-medium mr-2">
                <AlertTriangle size={12} className="inline -mt-0.5 mr-0.5" />
                {overdueCount} overdue
              </span>
            )}
            {tasks.filter((t) => !t.completedAt).length} open ·{" "}
            {tasks.filter((t) => t.completedAt).length} completed
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setComposerOpen(true)}
        >
          <Plus size={14} /> New task
        </button>
      </header>

      {/* Filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={
              "pill " +
              (filter === f.key
                ? f.key === "overdue" && (f.count ?? 0) > 0
                  ? "bg-red-50 text-red-700 border-red-200"
                  : "pill-active"
                : "")
            }
          >
            {f.label}
            {f.count !== undefined && f.count > 0 && (
              <span className="ml-1 bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0">
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Task composer modal */}
      {composerOpen && (
        <div className="modal-overlay" onClick={() => setComposerOpen(false)}>
          <div
            className="modal-card w-full max-w-lg p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">New Task</h2>
              <button
                className="size-7 grid place-items-center rounded text-muted hover:bg-surface"
                onClick={() => setComposerOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <input
              autoFocus
              className="input"
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void createTask();
              }}
            />

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="label">Priority</span>
                <select
                  className="input mt-1"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </label>
              <label className="block">
                <span className="label">Due date</span>
                <input
                  type="datetime-local"
                  className="input mt-1"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="label">Assign to</span>
                <select
                  className="input mt-1"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name ?? u.email}
                      {u.id === currentUserId ? " (me)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label">Remind at</span>
                <input
                  type="datetime-local"
                  className="input mt-1"
                  value={reminderAt}
                  onChange={(e) => setReminderAt(e.target.value)}
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="label">Link to lead</span>
                <select
                  className="input mt-1"
                  value={leadId}
                  onChange={(e) => setLeadId(e.target.value)}
                >
                  <option value="">None</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label">Link to opportunity</span>
                <select
                  className="input mt-1"
                  value={opportunityId}
                  onChange={(e) => setOpportunityId(e.target.value)}
                >
                  <option value="">None</option>
                  {opportunities.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button className="btn" onClick={() => setComposerOpen(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={createTask}
                disabled={saving || !title.trim()}
              >
                {saving ? "Creating…" : "Create task"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task list */}
      <div className="card overflow-hidden">
        <table className="tbl">
          <thead>
            <tr>
              <th className="!w-8" />
              <th>Task</th>
              <th className="!w-24">Priority</th>
              <th className="!w-28">Due</th>
              <th>Linked to</th>
              <th className="!w-36">Assignee</th>
              <th className="!w-10" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => {
              const over = isOverdue(t);
              const pc = PRIORITY_CONFIG[t.priority] ?? PRIORITY_CONFIG.MEDIUM;
              return (
                <tr
                  key={t.id}
                  className={over ? "!bg-red-50/40" : t.completedAt ? "opacity-60" : ""}
                >
                  <td>
                    <button
                      onClick={() => toggle(t)}
                      title={t.completedAt ? "Mark incomplete" : "Mark complete"}
                      className="text-mutedSoft hover:text-accent"
                    >
                      {t.completedAt ? (
                        <CheckCircle2 size={16} className="text-emerald-500" />
                      ) : (
                        <Circle size={16} />
                      )}
                    </button>
                  </td>
                  <td>
                    <span
                      className={
                        "font-medium " +
                        (t.completedAt ? "line-through text-mutedSoft" : "")
                      }
                    >
                      {t.title}
                    </span>
                    {t.reminderAt && !t.completedAt && (
                      <span
                        className="ml-2 text-mutedSoft"
                        title={`Reminder: ${new Date(t.reminderAt).toLocaleString()}`}
                      >
                        {t.reminded ? (
                          <BellOff size={11} className="inline -mt-0.5" />
                        ) : (
                          <Bell size={11} className="inline -mt-0.5" />
                        )}
                      </span>
                    )}
                  </td>
                  <td>
                    <select
                      className={`badge cursor-pointer ${pc.style} !text-[10px]`}
                      value={t.priority}
                      onChange={(e) => updatePriority(t.id, e.target.value)}
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </td>
                  <td>
                    {t.dueAt ? (
                      <span
                        className={
                          "text-[12px] font-medium " +
                          (over
                            ? "text-red-600"
                            : isDueToday(t)
                              ? "text-amber-600"
                              : "text-muted")
                        }
                      >
                        <Clock
                          size={11}
                          className="inline -mt-0.5 mr-0.5"
                        />
                        {relDue(t.dueAt)}
                      </span>
                    ) : (
                      <span className="text-mutedSoft text-[12px]">—</span>
                    )}
                  </td>
                  <td className="text-[12px]">
                    {t.lead ? (
                      <Link
                        href={`/app/leads/${t.lead.id}`}
                        className="text-accent hover:underline flex items-center gap-1"
                      >
                        <Target size={11} /> {t.lead.name}
                      </Link>
                    ) : t.opportunity ? (
                      <Link
                        href={`/app/opportunities/${t.opportunity.id}`}
                        className="text-accent hover:underline flex items-center gap-1"
                      >
                        <Trophy size={11} /> {t.opportunity.name}
                      </Link>
                    ) : (
                      <span className="text-mutedSoft">—</span>
                    )}
                  </td>
                  <td className="text-[12px] text-muted truncate">
                    {t.assignee?.name ?? t.assignee?.email ?? "—"}
                  </td>
                  <td>
                    <button
                      onClick={() => remove(t.id)}
                      className="size-6 grid place-items-center rounded text-mutedSoft hover:text-rose-500 hover:bg-rose-50"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-muted py-10">
                  {filter === "overdue"
                    ? "No overdue tasks — nice work!"
                    : filter === "completed"
                      ? "No completed tasks yet."
                      : "No tasks match this filter."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
