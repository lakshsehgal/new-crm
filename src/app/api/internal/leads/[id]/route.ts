import { NextRequest, after } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  dispatchLeadEventAfter,
  dispatchLeadDeletedAfter,
  loadEnrichedLead,
} from "@/lib/webhooks";
import { executeWorkflows } from "@/lib/workflow-engine";
import { sendCapiLeadEvent } from "@/lib/meta-capi";
import { z } from "zod";

const Patch = z.object({
  name: z.string().optional(),
  status: z.enum(["POTENTIAL", "QUALIFIED", "INTERESTED", "CUSTOMER", "BAD_FIT", "CHURNED"]).optional(),
  url: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  customData: z.record(z.any()).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireUser();
  const { id } = await params;
  const data = Patch.parse(await req.json());

  // Grab the previous status (+ primary contact for PII matching) before the
  // update so we only fire a CAPI event when the status actually changes.
  const before = await db.lead.findUnique({
    where: { id },
    select: {
      status: true,
      contacts: {
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { email: true, phone: true, firstName: true, lastName: true },
      },
    },
  });

  const lead = await db.lead.update({ where: { id }, data });
  dispatchLeadEventAfter("LEAD_UPDATED", lead.id);
  if (data.status) {
    after(() =>
      executeWorkflows("LEAD_STATUS_CHANGED", {
        leadId: lead.id,
        status: data.status,
        userId: lead.ownerId ?? undefined,
      }),
    );
  }

  // Feed the lead's new stage back to Meta's Conversions API. This is the
  // signal that teaches Meta which leads are good (QUALIFIED/CUSTOMER) and
  // which are junk (BAD_FIT → DisqualifiedLead), so it optimizes accordingly.
  // Run in after() so it completes on serverless even after the response ships.
  if (data.status && before && data.status !== before.status) {
    after(() =>
      sendCapiLeadEvent({
        lead,
        contact: before.contacts[0] ?? null,
        status: data.status!,
      }),
    );
  }

  return Response.json(lead);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireUser();
  const { id } = await params;
  // Snapshot lead + relations before delete so the webhook still has full context.
  const snapshot = await loadEnrichedLead(id);
  await db.lead.delete({ where: { id } });
  if (snapshot) dispatchLeadDeletedAfter(snapshot);
  return Response.json({ ok: true });
}
