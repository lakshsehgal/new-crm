import { NextRequest, after } from "next/server";
import { authenticateApiRequest, unauthorized } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { dispatchWebhook, dispatchLeadEventAfter } from "@/lib/webhooks";
import { notifyLeadCreated } from "@/lib/mailer";
import { Prisma } from "@prisma/client";
import { z, ZodError } from "zod";

// Zapier (and other integrators) send empty strings for missing fields
// instead of omitting them. Zod's strict .email() / .url() throw on empty
// strings, which turns into a 500. Use lenient helpers that treat empty
// strings as "not provided".
const optionalEmail = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().email().optional(),
);
// URLs from FB lead forms are often typed as "acme.com" or "www.acme.com"
// without a scheme. Normalize: strip whitespace, drop empty, auto-prefix
// https:// when the scheme is missing, then validate. Anything that can't
// be coerced into a valid URL is silently dropped (treated as "not
// provided") so a junk URL value doesn't 400 the whole lead — real leads
// sometimes have "TEST" or similar garbage in the website field.
const optionalUrl = z.preprocess((v) => {
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  if (trimmed === "") return undefined;
  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    if (/^[^\s]+\.[^\s]+$/.test(candidate)) candidate = `https://${candidate}`;
    else return undefined; // doesn't look like a domain → drop
  }
  try {
    // Final sanity check via WHATWG URL parser
    new URL(candidate);
    return candidate;
  } catch {
    return undefined;
  }
}, z.string().url().optional());
const optionalStr = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().optional(),
);

const Body = z.object({
  // name is now optional — if omitted, we derive it from `url` (brand domain)
  // or fall back to `contactName`. Makes FB Lead Ads flows work out of the
  // box when the form only collects a website, not a company name.
  name: optionalStr,
  status: z.enum(["POTENTIAL", "INTERESTED", "QUALIFIED", "CUSTOMER", "BAD_FIT", "CHURNED"]).optional(),
  url: optionalUrl,
  description: optionalStr,
  address: optionalStr,
  // Lead-level custom fields, keyed by CustomField.key. Empty-string values
  // get stripped below so the UI doesn't show blank fields.
  customData: z.record(z.any()).optional(),
  // Optional first contact fields
  contactName: optionalStr,
  contactEmail: optionalEmail,
  contactPhone: optionalStr,
  contactTitle: optionalStr,
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

/**
 * Fold flat keys of the form `customData[key]` or `customData.key` into
 * a proper nested `customData: {...}` object. Same for contactCustomData.
 * This tolerates webhook builders that don't send real nested JSON (e.g.
 * Zapier's POST action with Unflatten off, Make.com, some low-code tools).
 */
function normalizeNestedKeys(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const body = { ...(raw as Record<string, unknown>) };
  const targets = ["customData", "contactCustomData"] as const;
  for (const target of targets) {
    const nested = (body[target] as Record<string, unknown>) ?? {};
    const collected: Record<string, unknown> = { ...nested };
    const re = new RegExp(`^${target}[\\[.]([^\\].]+)\\]?$`);
    for (const [k, v] of Object.entries(body)) {
      const m = k.match(re);
      if (m) {
        collected[m[1]!] = v;
        delete body[k];
      }
    }
    if (Object.keys(collected).length > 0) body[target] = collected;
  }
  return body;
}

/** Drop entries whose value is null / undefined / empty string. */
function stripEmpty(obj: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!obj) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    out[k] = v;
  }
  return out;
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

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ error: "Body must be valid JSON" }, { status: 400 });
  }

  // Zapier/webhook builders sometimes send customData as flat bracket keys
  // ('customData[current_revenue]': '...') instead of a nested object. Fold
  // those into a real nested object before Zod validation so the API is
  // tolerant of either shape.
  raw = normalizeNestedKeys(raw);

  let data: z.infer<typeof Body>;
  try {
    data = Body.parse(raw);
  } catch (err) {
    if (err instanceof ZodError) {
      return Response.json(
        { error: "Invalid body", issues: err.issues },
        { status: 400 },
      );
    }
    throw err;
  }

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

  const cleanLeadCustom = stripEmpty(data.customData);
  const cleanContactCustom = stripEmpty(data.contactCustomData);

  try {
    const result = await db.$transaction(async (tx) => {
      const lead = await tx.lead.create({
        data: {
          name: leadName,
          status: data.status ?? "POTENTIAL",
          url: data.url ?? null,
          description: data.description ?? null,
          address: data.address ?? null,
          customData: cleanLeadCustom as Prisma.InputJsonValue,
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
            customData: cleanContactCustom as Prisma.InputJsonValue,
            leadId: lead.id,
            ownerId: caller.userId,
          },
        });
      }
      return { lead, contact };
    });
    // Use after() for all background work so Vercel keeps the function
    // alive until completion, avoiding ECONNRESET on outbound fetches.
    const leadForEmail = result.lead;
    const contactForEmail = result.contact;
    dispatchLeadEventAfter("LEAD_CREATED", result.lead.id);
    if (contactForEmail) {
      after(async () => {
        await dispatchWebhook("CONTACT_CREATED", contactForEmail);
      });
    }
    after(async () => {
      try {
        const envTo = (process.env.LEAD_NOTIFICATION_EMAILS ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        let recipients = envTo;
        if (recipients.length === 0) {
          const owner = await db.user.findUnique({
            where: { id: caller.userId },
            select: { email: true },
          });
          if (owner?.email) recipients = [owner.email];
        }
        // Resolve app origin: env var > request origin > custom-domain default.
        let origin = process.env.NEXT_PUBLIC_APP_URL;
        if (!origin) {
          try {
            origin = req.nextUrl.origin;
          } catch {
            origin = "https://sales.neuroidmedia.com";
          }
        }
        await notifyLeadCreated(recipients, {
          leadId: leadForEmail.id,
          leadName: leadForEmail.name,
          url: leadForEmail.url,
          description: leadForEmail.description,
          status: leadForEmail.status,
          customData: (leadForEmail.customData as Record<string, unknown>) ?? {},
          contact: contactForEmail
            ? {
                name:
                  [contactForEmail.firstName, contactForEmail.lastName]
                    .filter(Boolean)
                    .join(" ") || null,
                email: contactForEmail.email,
                phone: contactForEmail.phone,
                title: contactForEmail.title,
              }
            : null,
          appOrigin: origin,
        });
      } catch (err) {
        console.error("[leads] post-create alert failed:", err);
      }
    });

    return Response.json(result, { status: 201 });
  } catch (err) {
    console.error("POST /api/v1/leads failed:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return Response.json({ error: message }, { status: 500 });
  }
}
