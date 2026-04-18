import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import TasksPageUI from "./TasksPageUI";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const user = await requireUser();

  const [tasks, users, leads, opportunities] = await Promise.all([
    db.activity.findMany({
      where: { type: "TASK" },
      orderBy: [{ completedAt: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
      take: 500,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        user: { select: { id: true, name: true, email: true } },
        lead: { select: { id: true, name: true } },
        opportunity: { select: { id: true, name: true } },
      },
    }),
    db.user.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    db.lead.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 200,
    }),
    db.opportunity.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 200,
    }),
  ]);

  return (
    <TasksPageUI
      currentUserId={user.id}
      tasks={tasks.map((t) => ({
        id: t.id,
        title: t.title,
        body: t.body,
        priority: t.priority,
        dueAt: t.dueAt?.toISOString() ?? null,
        completedAt: t.completedAt?.toISOString() ?? null,
        reminderAt: t.reminderAt?.toISOString() ?? null,
        reminded: t.reminded,
        assignee: t.assignee
          ? { id: t.assignee.id, name: t.assignee.name, email: t.assignee.email }
          : null,
        createdBy: t.user
          ? { id: t.user.id, name: t.user.name, email: t.user.email }
          : null,
        lead: t.lead ? { id: t.lead.id, name: t.lead.name } : null,
        opportunity: t.opportunity
          ? { id: t.opportunity.id, name: t.opportunity.name }
          : null,
        createdAt: t.createdAt.toISOString(),
      }))}
      users={users}
      leads={leads}
      opportunities={opportunities}
    />
  );
}
