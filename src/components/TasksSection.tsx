"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X, CheckCircle2, Circle } from "lucide-react";

type Task = {
  id: string;
  title: string;
  body: string | null;
  dueAt: string | null;
  completedAt: string | null;
};

export default function TasksSection({
  leadId,
  opportunityId,
  contactId,
  initialTasks,
}: {
  leadId?: string;
  opportunityId?: string;
  contactId?: string;
  initialTasks: Task[];
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function add() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/internal/activities", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "TASK",
          title,
          dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
          leadId,
          opportunityId,
          contactId,
        }),
      });
      if (!res.ok) {
        toast.error("Failed to add task");
        return;
      }
      const created = await res.json();
      setTasks((prev) => [
        {
          id: created.id,
          title: created.title,
          body: created.body,
          dueAt: created.dueAt,
          completedAt: created.completedAt,
        },
        ...prev,
      ]);
      setTitle("");
      setDueAt("");
      setComposerOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function toggle(t: Task) {
    const next = !t.completedAt;
    // Optimistic
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
      toast.error("Failed to update");
      // Revert
      setTasks((prev) =>
        prev.map((x) =>
          x.id === t.id ? { ...x, completedAt: t.completedAt } : x,
        ),
      );
    } else {
      router.refresh();
    }
  }

  async function remove(t: Task) {
    if (!confirm("Delete this task?")) return;
    setTasks((prev) => prev.filter((x) => x.id !== t.id));
    const res = await fetch(`/api/internal/activities/${t.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("Failed to delete");
      return;
    }
    router.refresh();
  }

  const open = tasks.filter((t) => !t.completedAt);
  const done = tasks.filter((t) => t.completedAt);

  return (
    <div>
      {tasks.length > 0 && (
        <ul className="divide-y divide-border">
          {[...open, ...done].map((t) => (
            <li
              key={t.id}
              className="px-4 py-2 text-sm flex items-start gap-2 hover:bg-surface/40"
            >
              <button
                className="mt-0.5 text-mutedSoft hover:text-accent"
                onClick={() => toggle(t)}
                title={t.completedAt ? "Mark incomplete" : "Mark complete"}
              >
                {t.completedAt ? (
                  <CheckCircle2 size={15} className="text-emerald-500" />
                ) : (
                  <Circle size={15} />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div
                  className={
                    "truncate " +
                    (t.completedAt ? "line-through text-mutedSoft" : "")
                  }
                >
                  {t.title}
                </div>
                {t.dueAt && (
                  <div className="text-[11px] text-mutedSoft">
                    Due {new Date(t.dueAt).toLocaleDateString()}
                  </div>
                )}
              </div>
              <button
                className="text-mutedSoft hover:text-rose-500"
                onClick={() => remove(t)}
                title="Delete"
              >
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {composerOpen ? (
        <div className="px-3 py-3 border-t border-border space-y-2 bg-surface/30">
          <input
            autoFocus
            className="input"
            placeholder="What needs to be done?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void add();
              }
              if (e.key === "Escape") setComposerOpen(false);
            }}
          />
          <input
            type="date"
            className="input"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button className="btn" onClick={() => setComposerOpen(false)}>
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={add}
              disabled={saving || !title.trim()}
            >
              {saving ? "Adding…" : "Add task"}
            </button>
          </div>
        </div>
      ) : (
        <button
          className="w-full text-left px-4 py-2.5 text-[13px] text-mutedSoft hover:bg-surface/60 hover:text-ink flex items-center gap-2 border-t border-border"
          onClick={() => setComposerOpen(true)}
        >
          <Plus size={13} />
          Add a task
        </button>
      )}
    </div>
  );
}
