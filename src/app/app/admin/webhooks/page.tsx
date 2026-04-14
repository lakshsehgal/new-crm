import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import WebhooksUI from "./WebhooksUI";

export const dynamic = "force-dynamic";

const ALL_EVENTS = [
  "CONTACT_CREATED", "CONTACT_UPDATED", "CONTACT_DELETED",
  "LEAD_CREATED", "LEAD_UPDATED", "LEAD_DELETED",
  "OPPORTUNITY_CREATED", "OPPORTUNITY_UPDATED", "OPPORTUNITY_STAGE_CHANGED", "OPPORTUNITY_DELETED",
  "ACTIVITY_CREATED", "EMAIL_RECEIVED", "EMAIL_SENT",
] as const;

export default async function AdminWebhooksPage() {
  await requireAdmin();
  const endpoints = await db.webhookEndpoint.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      deliveries: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return (
    <div className="p-6 space-y-4">
      <header>
        <h1 className="text-xl font-semibold">Webhooks</h1>
        <p className="text-sm text-muted">
          Send events to external systems. Payloads are signed with HMAC-SHA256 in the
          <code className="ml-1">x-crm-signature</code> header.
        </p>
      </header>
      <WebhooksUI
        allEvents={Array.from(ALL_EVENTS)}
        endpoints={endpoints.map((e) => ({
          id: e.id,
          url: e.url,
          secret: e.secret,
          events: e.events as any,
          active: e.active,
          description: e.description,
          lastStatus: e.deliveries[0]?.status ?? null,
          lastAt: e.deliveries[0]?.createdAt.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
