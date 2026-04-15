/**
 * Lightweight mailer for transactional alerts (new lead, etc.).
 *
 * Uses Resend via raw fetch — no npm dependency, just an HTTP POST. The
 * Vercel Resend integration auto-provisions RESEND_API_KEY. If the key
 * isn't set, every call is a silent no-op so dev environments keep working.
 */

const RESEND_URL = "https://api.resend.com/emails";

export type LeadAlertPayload = {
  leadId: string;
  leadName: string;
  url: string | null;
  description: string | null;
  status: string;
  customData: Record<string, unknown>;
  contact: {
    name: string | null;
    email: string | null;
    phone: string | null;
    title: string | null;
  } | null;
  appOrigin: string; // e.g. https://sales.neuroidmedia.com
};

/**
 * Fire a new-lead notification email. Fire-and-forget; failures are logged
 * but never throw — we don't want a notification outage to block lead
 * creation.
 */
export async function notifyLeadCreated(
  to: string[],
  payload: LeadAlertPayload,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info("[mailer] RESEND_API_KEY not set — skipping lead alert");
    return;
  }
  if (to.length === 0) {
    console.info("[mailer] no recipients — skipping lead alert");
    return;
  }

  const from =
    process.env.LEAD_NOTIFICATION_FROM ??
    "Neuroid CRM <onboarding@resend.dev>";

  const subject = `🎯 New lead: ${payload.leadName}`;
  const html = renderLeadEmail(payload);

  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(
        `[mailer] Resend returned ${res.status}: ${body.slice(0, 300)}`,
      );
    }
  } catch (err) {
    console.error("[mailer] lead-alert send failed:", err);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function row(label: string, value: string | null | undefined): string {
  if (!value) return "";
  return `<tr>
    <td style="padding:6px 10px 6px 0;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td>
    <td style="padding:6px 0;color:#0f1419;font-size:14px;vertical-align:top">${escapeHtml(value)}</td>
  </tr>`;
}

function renderLeadEmail(p: LeadAlertPayload): string {
  const leadUrl = `${p.appOrigin.replace(/\/$/, "")}/app/leads/${p.leadId}`;
  const customRows = Object.entries(p.customData)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => row(humanizeKey(k), String(v)))
    .join("");
  const contactBlock = p.contact
    ? `<tr><td colspan="2" style="padding:12px 0 4px 0;color:#0f1419;font-size:13px;font-weight:600;border-top:1px solid #e6e8ec">Primary contact</td></tr>
       ${row("Name", p.contact.name)}
       ${row("Title", p.contact.title)}
       ${row("Email", p.contact.email)}
       ${row("Phone", p.contact.phone)}`
    : "";
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f7f8fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e6e8ec;border-radius:12px;overflow:hidden">
      <div style="padding:20px 24px;background:linear-gradient(135deg,#2563eb 0%,#8b5cf6 100%);color:#ffffff">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;opacity:0.85">New lead</div>
        <div style="font-size:20px;font-weight:700;margin-top:4px">${escapeHtml(p.leadName)}</div>
        <div style="font-size:12px;margin-top:4px;opacity:0.9">Status: ${escapeHtml(p.status)}</div>
      </div>
      <div style="padding:18px 24px">
        <table style="width:100%;border-collapse:collapse">
          ${row("Website", p.url)}
          ${row("Source", p.description)}
          ${customRows}
          ${contactBlock}
        </table>
        <div style="margin-top:20px">
          <a href="${escapeHtml(leadUrl)}"
             style="display:inline-block;padding:10px 18px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">
            Open lead in CRM →
          </a>
        </div>
      </div>
      <div style="padding:12px 24px;border-top:1px solid #e6e8ec;color:#9ca3af;font-size:11px">
        Sent by Neuroid CRM · You're receiving this because a new lead was created via API.
      </div>
    </div>
  </body>
</html>`;
}

function humanizeKey(key: string): string {
  return key
    .replace(/[_\-]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
