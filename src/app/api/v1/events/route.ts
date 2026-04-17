import { NextRequest } from "next/server";
import { authenticateApiRequest, unauthorized } from "@/lib/api-auth";
import { db } from "@/lib/db";
import {
  dispatchWebhookAfter,
  dispatchOpportunityEventAfter,
  dispatchLeadEventAfter,
} from "@/lib/webhooks";
import { z } from "zod";

/**
 * Generic inbound event endpoint for n8n / Zapier.
 *
 * Supported types:
 *   - "lead.upsert"         { name, status?, url?, description?, address? }
 *   - "contact.upsert"      { email, leadName?, firstName?, lastName?, ... }
 *   - "opportunity.create"  { name, leadName, stageName?, value?, currency? }
 *   - "activity.log"        { leadName?, contactEmail?, title, body?, type? }
 *   - "opportunity.move"    { id, stageName }
 */
const Body = z.object({
  type: z.string(),
  data: z.record(z.any()),
});

async function upsertLeadByName(name: string, ownerId: string) {
  const existing = await db.lead.findFirst({ where: { name } });
  return (
    existing ??
    (await db.lead.create({ data: { name, ownerId } }))
  );
}

export async function POST(req: NextRequest) {
  const caller = await authenticateApiRequest(req);
  if (!caller) return unauthorized();
  const { type, data } = Body.parse(await req.json());

  switch (type) {
    case "lead.upsert": {
      const name = String(data.name ?? "").trim();
      if (!name) return Response.json({ error: "name required" }, { status: 400 });
      const existing = await db.lead.findFirst({ where: { name } });
      const payload = {
        name,
        status: (data.status ?? existing?.status ?? "POTENTIAL") as any,
        url: data.url ?? existing?.url ?? null,
        description: data.description ?? existing?.description ?? null,
        address: data.address ?? existing?.address ?? null,
      };
      const lead = existing
        ? await db.lead.update({ where: { id: existing.id }, data: payload })
        : await db.lead.create({ data: { ...payload, ownerId: caller.userId } });
      dispatchLeadEventAfter(existing ? "LEAD_UPDATED" : "LEAD_CREATED", lead.id);
      return Response.json(lead);
    }

    case "contact.upsert": {
      const email = String(data.email ?? "").trim().toLowerCase();
      if (!email) return Response.json({ error: "email required" }, { status: 400 });
      let leadId: string | null = null;
      if (data.leadName) {
        const l = await upsertLeadByName(String(data.leadName), caller.userId);
        leadId = l.id;
      }
      const existing = await db.contact.findFirst({ where: { email } });
      const payload = {
        email,
        firstName: data.firstName ?? existing?.firstName ?? null,
        lastName: data.lastName ?? existing?.lastName ?? null,
        phone: data.phone ?? existing?.phone ?? null,
        title: data.title ?? existing?.title ?? null,
        leadId: leadId ?? existing?.leadId ?? null,
      };
      const contact = existing
        ? await db.contact.update({ where: { id: existing.id }, data: payload })
        : await db.contact.create({
            data: { ...payload, ownerId: caller.userId },
          });
      dispatchWebhookAfter(existing ? "CONTACT_UPDATED" : "CONTACT_CREATED", contact);
      return Response.json(contact);
    }

    case "opportunity.create": {
      const leadName = String(data.leadName ?? "").trim();
      if (!leadName) return Response.json({ error: "leadName required" }, { status: 400 });
      const lead = await upsertLeadByName(leadName, caller.userId);
      const pipeline = await db.pipeline.findFirst({ where: { isDefault: true } }) ??
        (await db.pipeline.findFirst());
      if (!pipeline) return Response.json({ error: "no pipeline" }, { status: 400 });
      const stage = data.stageName
        ? await db.pipelineStage.findFirst({
            where: { pipelineId: pipeline.id, name: String(data.stageName) },
          })
        : await db.pipelineStage.findFirst({
            where: { pipelineId: pipeline.id },
            orderBy: { order: "asc" },
          });
      if (!stage) return Response.json({ error: "no stage" }, { status: 400 });
      const count = await db.opportunity.count({ where: { stageId: stage.id } });
      const opp = await db.opportunity.create({
        data: {
          name: String(data.name ?? leadName),
          value: data.value ? Number(data.value) : 0,
          currency: String(data.currency ?? "INR"),
          pipelineId: pipeline.id,
          stageId: stage.id,
          stageOrder: count,
          leadId: lead.id,
          ownerId: caller.userId,
        },
      });
      dispatchOpportunityEventAfter("OPPORTUNITY_CREATED", opp.id);
      return Response.json(opp);
    }

    case "activity.log": {
      let leadId: string | null = null;
      let contactId: string | null = null;
      if (data.leadName) {
        leadId = (await upsertLeadByName(String(data.leadName), caller.userId)).id;
      }
      if (data.contactEmail) {
        const c = await db.contact.findFirst({
          where: { email: String(data.contactEmail) },
        });
        contactId = c?.id ?? null;
        if (c && !leadId) leadId = c.leadId;
      }
      const activity = await db.activity.create({
        data: {
          type: (data.type ?? "NOTE") as any,
          title: String(data.title ?? "Event"),
          body: data.body ?? null,
          leadId,
          contactId,
          userId: caller.userId,
        },
      });
      dispatchWebhookAfter("ACTIVITY_CREATED", activity);
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
        data: {
          stageId: stage.id,
          closedAt: stage.isWon || stage.isLost ? new Date() : null,
        },
      });
      dispatchOpportunityEventAfter("OPPORTUNITY_STAGE_CHANGED", updated.id);
      return Response.json(updated);
    }

    default:
      return Response.json({ error: `Unknown type: ${type}` }, { status: 400 });
  }
}
