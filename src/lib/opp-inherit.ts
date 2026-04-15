import { Prisma } from "@prisma/client";
import { db } from "./db";

/**
 * Build a customData snapshot for a new opportunity, copying values from
 * its parent lead for every CustomField whose `appliesTo` includes BOTH
 * LEAD and OPPORTUNITY (shared scope).
 *
 * Uses Option A (snapshot) semantics: the opp gets a copy at creation time;
 * later edits to the lead do NOT propagate. Later edits to the opp do NOT
 * flow back to the lead either.
 *
 * Returns a value assignable to a Prisma `Json` input field.
 */
export async function inheritedCustomData(leadId: string): Promise<Prisma.InputJsonValue> {
  const [lead, sharedFields] = await Promise.all([
    db.lead.findUnique({
      where: { id: leadId },
      select: { customData: true },
    }),
    db.customField.findMany({
      where: { appliesTo: { hasEvery: ["LEAD", "OPPORTUNITY"] } },
      select: { key: true },
    }),
  ]);
  const src = (lead?.customData ?? {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const { key } of sharedFields) {
    const v = src[key];
    if (v !== null && v !== undefined && v !== "") {
      out[key] = v;
    }
  }
  return out as Prisma.InputJsonValue;
}
