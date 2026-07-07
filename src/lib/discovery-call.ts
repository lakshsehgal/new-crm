import { db } from "@/lib/db";
import { dispatchWebhook } from "@/lib/webhooks";
import type { Prisma } from "@prisma/client";

/**
 * Discovery-call tickets are Activity rows of type CALL whose title starts
 * with this prefix. One is auto-created whenever a lead enters the QUALIFIED
 * status, and it surfaces in the "Discovery Calls" section until completed.
 * The prefix is the discriminator that separates these tickets from calls
 * logged manually on a contact/lead (which are records of past calls, not
 * work that is due).
 */
export const DISCOVERY_CALL_TITLE_PREFIX = "Discovery call";

/** Matches open (not yet completed) discovery-call tickets. */
export const openDiscoveryCallWhere: Prisma.ActivityWhereInput = {
  type: "CALL",
  completedAt: null,
  leadId: { not: null },
  title: { startsWith: DISCOVERY_CALL_TITLE_PREFIX },
};

/**
 * Create the discovery-call ticket for a lead unless it already has an open
 * one (re-qualifying a lead or bulk status updates must not pile up
 * duplicate tickets). Due 24h after qualification.
 */
export async function ensureDiscoveryCallTask(leadId: string, userId?: string) {
  const existing = await db.activity.findFirst({
    where: { ...openDiscoveryCallWhere, leadId },
  });
  if (existing) return existing;

  const lead = await db.lead.findUnique({
    where: { id: leadId },
    include: { contacts: { take: 1, orderBy: { createdAt: "asc" } } },
  });
  if (!lead) return null;

  const activity = await db.activity.create({
    data: {
      type: "CALL",
      title: `${DISCOVERY_CALL_TITLE_PREFIX}: ${lead.name}`,
      body: "Auto-created when the lead was marked Qualified.",
      dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      leadId: lead.id,
      contactId: lead.contacts[0]?.id ?? null,
      userId: userId ?? lead.ownerId ?? null,
    },
  });
  void dispatchWebhook("ACTIVITY_CREATED", activity);
  return activity;
}
