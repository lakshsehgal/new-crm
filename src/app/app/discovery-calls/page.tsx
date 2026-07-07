import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import {
  DISCOVERY_CALL_TITLE_PREFIX,
  openDiscoveryCallWhere,
} from "@/lib/discovery-call";
import DiscoveryCallsList, { type CallRow } from "./DiscoveryCallsList";

export const dynamic = "force-dynamic";

const callInclude = {
  lead: {
    include: {
      contacts: { orderBy: { createdAt: "asc" as const }, take: 5 },
      opportunities: { select: { id: true }, take: 1 },
    },
  },
  user: { select: { name: true, email: true } },
} satisfies Prisma.ActivityInclude;

type CallWithLead = Prisma.ActivityGetPayload<{ include: typeof callInclude }>;

function toRow(a: CallWithLead): CallRow | null {
  if (!a.lead) return null;
  // First contact with a phone number wins; fall back to the oldest contact
  const contact = a.lead.contacts.find((c) => c.phone) ?? a.lead.contacts[0];
  return {
    id: a.id,
    title: a.title,
    dueAt: a.dueAt?.toISOString() ?? null,
    completedAt: a.completedAt?.toISOString() ?? null,
    leadId: a.lead.id,
    leadName: a.lead.name,
    leadUrl: a.lead.url,
    leadStatus: a.lead.status,
    contactName: contact
      ? [contact.firstName, contact.lastName].filter(Boolean).join(" ") ||
        contact.email ||
        null
      : null,
    phone: contact?.phone ?? null,
    ownerLabel: a.user?.name || a.user?.email || null,
    opportunityId: a.lead.opportunities[0]?.id ?? null,
  };
}

export default async function DiscoveryCallsPage() {
  const [due, completed, pipelines] = await Promise.all([
    db.activity.findMany({
      where: openDiscoveryCallWhere,
      orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
      include: callInclude,
    }),
    db.activity.findMany({
      where: {
        type: "CALL",
        completedAt: { not: null },
        leadId: { not: null },
        title: { startsWith: DISCOVERY_CALL_TITLE_PREFIX },
      },
      orderBy: { completedAt: "desc" },
      take: 50,
      include: callInclude,
    }),
    db.pipeline.findMany({
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      include: { stages: { orderBy: { order: "asc" }, select: { id: true, name: true } } },
    }),
  ]);

  const dueRows = due.map(toRow).filter((r): r is CallRow => r !== null);
  const doneRows = completed.map(toRow).filter((r): r is CallRow => r !== null);

  return (
    <div className="p-6 space-y-4 fade-in">
      <header>
        <h1 className="text-xl font-semibold">Discovery Calls Due</h1>
        <p className="text-sm text-muted">
          {dueRows.length === 0
            ? "No calls waiting — qualify a lead to open a ticket here."
            : `${dueRows.length} call${dueRows.length === 1 ? "" : "s"} waiting. Tickets open automatically when a lead is marked Qualified.`}
        </p>
      </header>

      <DiscoveryCallsList
        due={dueRows}
        completed={doneRows}
        pipelines={pipelines.map((p) => ({
          id: p.id,
          name: p.name,
          stages: p.stages,
        }))}
      />
    </div>
  );
}
