import { NextRequest } from "next/server";
import { authenticateApiRequest, unauthorized } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { dispatchWebhook } from "@/lib/webhooks";
import { z } from "zod";

/**
 * Generic inbound event endpoint for n8n / Zapier.
 * - Authenticated by API key.
 * - Accepts { type, data } where type selects a handler.
 *
 * Supported types:
 *   - "contact.upsert"           { email, firstName?, lastName?, company?, phone?, title?, customData? }
 *   - "lead.create"              { title, contactEmail?, value?, source? }
 *   - "activity.log"             { contactEmail?, title, body?, type? }
 *   - "opportunity.move"         { id, stageName }
 */
const Body = z.object({
  type: z.string(),
  data: z.record(z.any()),
});

export async function POST(req: NextRequest) {
  const caller = await authenticateApiRequest(req);
  if (!caller) return unauthorized();
  const { type, data } = Body.parse(await req.json());

  switch (type) {
    case "contact.upsert": {
      const email = String(data.email ?? "").trim().toLowerCase();
      if (!email) return Response.json({ error: "email required" }, { status: 400 });
      const existing = await db.contact.findFirst({ where: { email } });
      const payload = {
        email,
        firstName: data.firstName ?? existing?.firstName ?? null,
        lastName: data.lastName ?? existing?.lastName ?? null,
        company: data.company ?? existing?.company ?? null,
        phone: data.phone ?? existing?.phone ?? null,
        title: data.title ?? existing?.title ?? null,
        customData: { ...(existing?.customData as any ?? {}), ...(data.customData ?? {}) },
      };
      const contact = existing
        ? await db.contact.update({ where: { id: existing.id }, data: payload })
        : await db.contact.create({ data: { ...payload, ownerId: caller.userId } });
      void dispatchWebhook(existing ? "CONTACT_UPDATED" : "CONTACT_CREATED", contact);
      return Response.json(contact);
    }
    case "lead.create": {
      let contactId: string | null = null;
      if (data.contactEmail) {
        const existing = await db.contact.findFirst({ where: { email: data.contactEmail } });
        contactId = existing?.id ??
          (await db.contact.create({ data: { email: data.contactEmail, ownerId: caller.userId } })).id;
      }
      const lead = await db.lead.create({
        data: {
          title: String(data.title ?? "Untitled lead"),
          value: data.value ? Number(data.value) : null,
          source: data.source ?? null,
          contactId,
          ownerId: caller.userId,
        },
      });
      void dispatchWebhook("LEAD_CREATED", lead);
      return Response.json(lead);
    }
    case "activity.log": {
      let contactId: string | null = null;
      if (data.contactEmail) {
        const c = await db.contact.findFirst({ where: { email: data.contactEmail } });
        contactId = c?.id ?? null;
      }
      const activity = await db.activity.create({
        data: {
          type: (data.type ?? "NOTE") as any,
          title: String(data.title ?? "Event"),
          body: data.body ?? null,
          contactId,
          userId: caller.userId,
        },
      });
      void dispatchWebhook("ACTIVITY_CREATED", activity);
      return Response.json(activity);
    }
    case "opportunity.move": {
      const opp = await db.opportunity.findUnique({ where: { id: String(data.id ?? "") } });
      if (!opp) return Response.json({ error: "not found" }, { status: 404 });
      const stage = await db.pipelineStage.findFirst({
        where: { pipelineId: opp.pipelineId, name: String(data.stageName ?? "") },
      });
      if (!stage) return Response.json({ error: "unknown stage" }, { status: 400 });
      const updated = await db.opportunity.update({
        where: { id: opp.id },
        data: { stageId: stage.id, closedAt: stage.isWon || stage.isLost ? new Date() : null },
      });
      void dispatchWebhook("OPPORTUNITY_STAGE_CHANGED", updated);
      return Response.json(updated);
    }
    default:
      return Response.json({ error: `Unknown type: ${type}` }, { status: 400 });
  }
}
