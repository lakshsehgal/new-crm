import { NextRequest } from "next/server";
import { authenticateApiRequest, unauthorized } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { dispatchWebhook } from "@/lib/webhooks";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const Body = z.object({
  // name is now optional — if omitted, we derive it from `url` (brand domain)
  // or fall back to `contactName`. Makes FB Lead Ads flows work out of the
  // box when the form only collects a website, not a company name.
  name: z.string().optional(),
  status: z.enum(["POTENTIAL", "QUALIFIED", "CUSTOMER", "BAD_FIT", "CHURNED"]).optional(),
  url: z.string().url().optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  // Lead-level custom fields, keyed by CustomField.key
  customData: z.record(z.any()).optional(),
  // Optional first contact fields
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  contactTitle: z.string().optional(),
  contactCustomData: z.record(z.any()).optional(),
});

/**
 * Turn a URL like `https://www.acme-corp.com/path` into a readable brand
 * name: "Acme Corp". Strips www., the TLD, normalizes separators, and
 * capitalizes each word. Returns null on unparseable input.
 */
function brandFromUrl(raw: string): string | null {
  try {
    const host = new URL(raw).hostname.replace(/^www\./i, "");
    const [brand] = host.split(".");
    if (!brand) return null;
    return brand
      .replace(/[-_]+/g, " ")
      .trim()
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const caller = await authenticateApiRequest(req);
  if (!caller) return unauthorized();
  const leads = await db.lead.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: { contacts: true, opportunities: true },
  });
  return Response.json({ data: leads });
}

export async function POST(req: NextRequest) {
  const caller = await authenticateApiRequest(req);
  if (!caller) return unauthorized();
  const data = Body.parse(await req.json());

  // Resolve lead name: explicit > derived from URL > contact name
  const leadName =
    data.name?.trim() ||
    (data.url ? brandFromUrl(data.url) : null) ||
    data.contactName?.trim() ||
    null;
  if (!leadName) {
    return Response.json(
      { error: "name, url, or contactName is required" },
      { status: 400 },
    );
  }

  const shouldMakeContact = !!(
    data.contactName ||
    data.contactEmail ||
    data.contactPhone ||
    data.contactTitle
  );
  const [firstName, ...rest] = (data.contactName ?? "").trim().split(/\s+/);
  const lastName = rest.join(" ") || undefined;

  const result = await db.$transaction(async (tx) => {
    const lead = await tx.lead.create({
      data: {
        name: leadName,
        status: data.status ?? "POTENTIAL",
        url: data.url ?? null,
        description: data.description ?? null,
        address: data.address ?? null,
        customData: (data.customData ?? {}) as Prisma.InputJsonValue,
        ownerId: caller.userId,
      },
    });
    let contact = null;
    if (shouldMakeContact) {
      contact = await tx.contact.create({
        data: {
          firstName: firstName || null,
          lastName: lastName || null,
          email: data.contactEmail || null,
          phone: data.contactPhone || null,
          title: data.contactTitle || null,
          customData: (data.contactCustomData ?? {}) as Prisma.InputJsonValue,
          leadId: lead.id,
          ownerId: caller.userId,
        },
      });
    }
    return { lead, contact };
  });
  void dispatchWebhook("LEAD_CREATED", result.lead);
  if (result.contact) void dispatchWebhook("CONTACT_CREATED", result.contact);
  return Response.json(result, { status: 201 });
}
