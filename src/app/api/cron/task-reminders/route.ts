import { db } from "@/lib/db";
import { NextRequest } from "next/server";

/**
 * Cron endpoint that fires every 5 minutes. Finds tasks that:
 *   1. Have a reminderAt that's past due and haven't been reminded yet
 *   2. Are overdue (dueAt < now) and haven't been completed
 *
 * Sends Slack notifications via SLACK_WEBHOOK_URL if configured. Marks
 * reminded = true so each task only triggers once until its reminder is
 * cleared or rescheduled.
 */
export async function GET(req: NextRequest) {
  // Vercel cron protection
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();

  // 1. Tasks with a reminder time that has passed
  const remindable = await db.activity.findMany({
    where: {
      type: "TASK",
      completedAt: null,
      reminded: false,
      reminderAt: { lte: now },
    },
    include: {
      assignee: { select: { name: true, email: true } },
      lead: { select: { id: true, name: true } },
      opportunity: { select: { id: true, name: true } },
    },
  });

  // 2. Overdue tasks (due date passed, not completed, not already reminded)
  const overdue = await db.activity.findMany({
    where: {
      type: "TASK",
      completedAt: null,
      reminded: false,
      reminderAt: null,
      dueAt: { lt: now },
    },
    include: {
      assignee: { select: { name: true, email: true } },
      lead: { select: { id: true, name: true } },
      opportunity: { select: { id: true, name: true } },
    },
  });

  const allTasks = [...remindable, ...overdue];
  if (allTasks.length === 0) {
    return Response.json({ ok: true, reminded: 0 });
  }

  // Mark all as reminded
  await db.activity.updateMany({
    where: { id: { in: allTasks.map((t) => t.id) } },
    data: { reminded: true },
  });

  // Send Slack notification if configured
  const slackUrl = process.env.SLACK_WEBHOOK_URL;
  if (slackUrl) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://sales.neuroidmedia.com";
    const blocks = allTasks.map((t) => {
      const assignee = t.assignee?.name ?? t.assignee?.email ?? "Unassigned";
      const linked = t.lead
        ? `<${appUrl}/app/leads/${t.lead.id}|${t.lead.name}>`
        : t.opportunity
          ? `<${appUrl}/app/opportunities/${t.opportunity.id}|${t.opportunity.name}>`
          : "—";
      const dueStr = t.dueAt
        ? new Date(t.dueAt).toLocaleDateString()
        : "No due date";
      const isOverdue = t.dueAt && new Date(t.dueAt) < now;
      const prefix = isOverdue ? ":rotating_light: *OVERDUE*" : ":bell: *Reminder*";
      return {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${prefix}: *${t.title}*\nAssigned to: ${assignee} · Due: ${dueStr} · Lead/Opp: ${linked}`,
        },
        accessory: {
          type: "button",
          text: { type: "plain_text", text: "Open Tasks" },
          url: `${appUrl}/app/tasks`,
        },
      };
    });

    try {
      await fetch(slackUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: `${allTasks.length} task${allTasks.length > 1 ? "s" : ""} need${allTasks.length === 1 ? "s" : ""} attention`,
          blocks: [
            {
              type: "header",
              text: {
                type: "plain_text",
                text: `${allTasks.length} Task${allTasks.length > 1 ? "s" : ""} Need Attention`,
              },
            },
            ...blocks,
          ],
        }),
      });
    } catch (err) {
      console.error("[cron] Slack notification failed:", err);
    }
  }

  return Response.json({ ok: true, reminded: allTasks.length });
}
