import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  dispatchLeadEventAfter,
  dispatchLeadDeletedAfter,
  loadEnrichedLead,
} from "@/lib/webhooks";
import { z } from "zod";

const Patch = z.object({
  name: z.string().optional(),
  status: z.enum(["POTENTIAL", "QUALIFIED", "CUSTOMER", "BAD_FIT", "CHURNED"]).optional(),
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
  const lead = await db.lead.update({ where: { id }, data });
  dispatchLeadEventAfter("LEAD_UPDATED", lead.id);
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
