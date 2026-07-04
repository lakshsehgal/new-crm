import { db } from "@/lib/db";
import { sha256 } from "@/lib/crypto";
import type { LeadStatus } from "@prisma/client";

/**
 * Meta Conversions API (CAPI) integration for the lead-quality feedback loop.
 *
 * Flow:
 *   Facebook/Instagram Lead Ad → Zapier → POST /api/v1/leads (stores metaLeadId)
 *   → sales team qualifies/disqualifies the lead in the CRM
 *   → we POST a "system_generated" server event back to Meta's dataset endpoint
 *     so Meta learns which leads were good and optimizes ad delivery.
 *
 * This is the "CRM integration for Conversions API" documented under
 * Events Manager → Connect data. All PII (email, phone, name) is SHA-256
 * hashed before it leaves the server, per Meta's requirements.
 *
 * Fully env-gated: if META_CAPI_DATASET_ID and META_CAPI_ACCESS_TOKEN are not
 * set, every call is a silent no-op so lead ingestion/updates never break.
 */

const GRAPH_HOST = "https://graph.facebook.com";

function config() {
  const datasetId = process.env.META_CAPI_DATASET_ID?.trim() || "";
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN?.trim() || "";
  const apiVersion = process.env.META_CAPI_API_VERSION?.trim() || "v25.0";
  const testEventCode = process.env.META_CAPI_TEST_EVENT_CODE?.trim() || "";
  // The name of your CRM, echoed to Meta as custom_data.lead_event_source.
  const leadEventSource =
    process.env.META_CAPI_LEAD_EVENT_SOURCE?.trim() || "new-crm";
  // Optional default country calling code (digits only, e.g. "91" for India).
  // Prepended to 10-digit local phone numbers that lack a country code so they
  // hash to the same value Meta stored. Leave unset to hash numbers as-is.
  const defaultCountryCode =
    process.env.META_CAPI_DEFAULT_COUNTRY_CODE?.replace(/[^\d]/g, "") || "";
  return {
    datasetId,
    accessToken,
    apiVersion,
    testEventCode,
    leadEventSource,
    defaultCountryCode,
  };
}

export function isCapiConfigured(): boolean {
  const c = config();
  return Boolean(c.datasetId && c.accessToken);
}

/**
 * Map each CRM lead stage to the Meta event_name reported when a lead enters
 * that stage. Override the whole map with META_CAPI_EVENT_MAP (JSON), or drop
 * a stage (set it to "") to stop reporting that transition.
 *
 * These names show up in Events Manager. "Lead" is a Meta standard event; the
 * rest are custom events you can optimize for via "Conversion leads".
 */
const DEFAULT_EVENT_MAP: Record<LeadStatus, string> = {
  POTENTIAL: "Lead", // initial raw lead
  QUALIFIED: "QualifiedLead",
  INTERESTED: "InterestedLead", // warm mid-funnel signal
  CUSTOMER: "Purchase",
  BAD_FIT: "DisqualifiedLead",
  CHURNED: "ChurnedLead",
};

function eventMap(): Record<LeadStatus, string> {
  const raw = process.env.META_CAPI_EVENT_MAP?.trim();
  if (!raw) return DEFAULT_EVENT_MAP;
  try {
    return { ...DEFAULT_EVENT_MAP, ...(JSON.parse(raw) as Record<string, string>) };
  } catch {
    console.error("[meta-capi] META_CAPI_EVENT_MAP is not valid JSON; using defaults");
    return DEFAULT_EVENT_MAP;
  }
}

/** SHA-256 hash a value after normalizing it, per Meta's matching spec. */
function hashNormalized(
  raw: string | null | undefined,
  normalize: (s: string) => string,
): string | undefined {
  if (!raw) return undefined;
  const norm = normalize(raw);
  return norm ? sha256(norm) : undefined;
}

const normEmail = (s: string) => s.trim().toLowerCase();
const normName = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

function normPhone(s: string): string {
  const { defaultCountryCode } = config();
  let digits = s.replace(/[^\d]/g, "");
  // Strip a leading "00" international prefix.
  if (digits.startsWith("00")) digits = digits.slice(2);
  // Prepend a default country code for bare 10-digit local numbers.
  if (defaultCountryCode && digits.length === 10) {
    digits = `${defaultCountryCode}${digits}`;
  }
  return digits;
}

type LeadInput = {
  id: string;
  status: LeadStatus;
  metaLeadId?: string | null;
};

type ContactInput = {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
} | null;

/**
 * Send one CAPI event for a lead entering a given status. Fire-and-forget:
 * safe to `void` from a route handler. Never throws — all failures are caught
 * and recorded in the MetaCapiEvent table.
 */
export async function sendCapiLeadEvent(params: {
  lead: LeadInput;
  contact?: ContactInput;
  status: LeadStatus;
  eventTime?: Date;
}): Promise<void> {
  if (!isCapiConfigured()) return;

  const c = config();
  const eventName = eventMap()[params.status];
  // Empty mapping means "don't report this stage".
  if (!eventName) return;

  const contact = params.contact ?? null;
  const eventTime = params.eventTime ?? new Date();
  // Deterministic event_id so Meta de-duplicates retries of the same
  // lead→stage transition. Same lead entering the same stage = one event.
  const eventId = `${params.lead.id}:${params.status}`;

  const userData: Record<string, unknown> = {};
  if (params.lead.metaLeadId) {
    // Meta accepts lead_id as a number; keep it as a plain (unhashed) field.
    userData.lead_id = params.lead.metaLeadId;
  }
  const em = hashNormalized(contact?.email, normEmail);
  const ph = hashNormalized(contact?.phone, normPhone);
  const fn = hashNormalized(contact?.firstName, normName);
  const ln = hashNormalized(contact?.lastName, normName);
  if (em) userData.em = [em];
  if (ph) userData.ph = [ph];
  if (fn) userData.fn = [fn];
  if (ln) userData.ln = [ln];

  const event: Record<string, unknown> = {
    event_name: eventName,
    event_time: Math.floor(eventTime.getTime() / 1000),
    action_source: "system_generated",
    event_id: eventId,
    user_data: userData,
    custom_data: {
      event_source: "crm",
      lead_event_source: c.leadEventSource,
    },
  };

  const payload: Record<string, unknown> = { data: [event] };
  if (c.testEventCode) payload.test_event_code = c.testEventCode;

  const url = `${GRAPH_HOST}/${c.apiVersion}/${c.datasetId}/events?access_token=${encodeURIComponent(
    c.accessToken,
  )}`;

  let httpStatus: number | null = null;
  let responseText = "";
  let fbTraceId: string | null = null;
  let eventsReceived: number | null = null;
  let errorText: string | null = null;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    httpStatus = res.status;
    responseText = await res.text().catch(() => "");
    try {
      const json = JSON.parse(responseText);
      fbTraceId = json?.fbtrace_id ?? null;
      eventsReceived = typeof json?.events_received === "number" ? json.events_received : null;
      if (!res.ok) {
        errorText = json?.error?.message
          ? `${json.error.message}${json.error.error_user_msg ? ` — ${json.error.error_user_msg}` : ""}`
          : responseText.slice(0, 2000);
      }
    } catch {
      if (!res.ok) errorText = responseText.slice(0, 2000);
    }
  } catch (err: any) {
    errorText = String(err?.message ?? err).slice(0, 2000);
  }

  try {
    await db.metaCapiEvent.create({
      data: {
        leadId: params.lead.id,
        eventName,
        status: params.status,
        metaLeadId: params.lead.metaLeadId ?? null,
        eventId,
        httpStatus,
        fbTraceId,
        eventsReceived,
        response: responseText ? responseText.slice(0, 4000) : null,
        error: errorText,
        testMode: Boolean(c.testEventCode),
      },
    });
  } catch (logErr) {
    console.error("[meta-capi] failed to record MetaCapiEvent:", logErr);
  }

  if (errorText) {
    console.error(
      `[meta-capi] event "${eventName}" for lead ${params.lead.id} failed:`,
      errorText,
    );
  }
}
