import { db } from "@/lib/db";

type TriggerConfig = {
  event: string;
  conditions?: Record<string, unknown>;
};

type ActionConfig = {
  type: string;
  config: Record<string, unknown>;
};

/**
 * Execute all active workflows matching the given trigger event. Called from
 * route handlers after a CRM entity changes.
 *
 * Supported triggers:
 *   LEAD_STATUS_CHANGED   — conditions: { status: "QUALIFIED" }
 *   LEAD_CREATED          — conditions: { status?: "..." }
 *   OPPORTUNITY_STAGE_CHANGED — conditions: { stageName: "No Show" }
 *   OPPORTUNITY_CREATED   — conditions: {}
 *
 * Supported actions:
 *   CREATE_TASK  — config: { title, priority, dueInHours, assignToOwner }
 *   SEND_SLACK   — config: { message }
 */
export async function executeWorkflows(
  event: string,
  context: {
    leadId?: string;
    opportunityId?: string;
    status?: string;
    stageName?: string;
    userId?: string;
  },
): Promise<void> {
  const workflows = await db.workflow.findMany({
    where: { active: true },
  });

  for (const wf of workflows) {
    const trigger = wf.trigger as unknown as TriggerConfig;
    if (trigger.event !== event) continue;

    if (!matchConditions(trigger.conditions, context)) continue;

    const actions = wf.actions as unknown as ActionConfig[];
    for (const action of actions) {
      try {
        await executeAction(action, context, wf.ownerId);
      } catch (err) {
        console.error(
          `[workflow] action ${action.type} failed for workflow "${wf.name}":`,
          err,
        );
      }
    }
  }
}

function matchConditions(
  conditions: Record<string, unknown> | undefined,
  context: Record<string, unknown>,
): boolean {
  if (!conditions) return true;
  for (const [key, expected] of Object.entries(conditions)) {
    if (expected === undefined || expected === null || expected === "") continue;
    if (context[key] !== expected) return false;
  }
  return true;
}

async function executeAction(
  action: ActionConfig,
  context: {
    leadId?: string;
    opportunityId?: string;
    status?: string;
    stageName?: string;
    userId?: string;
  },
  workflowOwnerId: string,
): Promise<void> {
  switch (action.type) {
    case "CREATE_TASK": {
      const c = action.config;
      const title = interpolate(String(c.title ?? "Follow up"), context);
      const dueHours = Number(c.dueInHours ?? 24);
      const dueAt = new Date(Date.now() + dueHours * 3600000);
      const assigneeId = c.assignToOwner ? context.userId ?? workflowOwnerId : workflowOwnerId;

      await db.activity.create({
        data: {
          type: "TASK",
          title,
          priority: (c.priority as any) ?? "HIGH",
          dueAt,
          assigneeId,
          userId: workflowOwnerId,
          leadId: context.leadId ?? null,
          opportunityId: context.opportunityId ?? null,
        },
      });
      break;
    }

    case "SEND_SLACK": {
      const slackUrl = process.env.SLACK_WEBHOOK_URL;
      if (!slackUrl) break;
      const message = interpolate(String(action.config.message ?? ""), context);
      await fetch(slackUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: message }),
      }).catch((err) => console.error("[workflow] Slack send failed:", err));
      break;
    }

    default:
      console.warn(`[workflow] unknown action type: ${action.type}`);
  }
}

function interpolate(template: string, ctx: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return String(ctx[key] ?? "");
  });
}
