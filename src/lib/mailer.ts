/**
 * Lightweight mailer for transactional alerts (new lead, etc.).
 *
 * Uses Resend via raw fetch — no npm dependency, just an HTTP POST. The
 * Vercel Resend integration auto-provisions RESEND_API_KEY. If the key
 * isn't set, every call is a silent no-op so dev environments keep working.
 */

const RESEND_URL = "https://api.resend.com/emails";

/**
 * Resolve the 'From' header for transactional emails. Preference order:
 *   1. EMAIL_FROM        (canonical)
 *   2. LEAD_NOTIFICATION_FROM (earlier name, kept for back-compat)
 *   3. Resend's shared testing sender (only deliverable to the account owner)
 */
function emailFromAddress(): string {
  return (
    process.env.EMAIL_FROM ??
    process.env.LEAD_NOTIFICATION_FROM ??
    "Neuroid CRM <onboarding@resend.dev>"
  );
}

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

  const from = emailFromAddress();

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
  const customEntries = Object.entries(p.customData).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  );
  const customSection = customEntries.length
    ? `<tr><td colspan="2" style="padding:14px 0 4px 0;color:#0f1419;font-size:13px;font-weight:700;border-top:1px solid #e6e8ec">Lead details</td></tr>
       ${customEntries.map(([k, v]) => row(humanizeKey(k), String(v))).join("")}`
    : "";
  const contactBlock = p.contact
    ? `<tr><td colspan="2" style="padding:14px 0 4px 0;color:#0f1419;font-size:13px;font-weight:700;border-top:1px solid #e6e8ec">Primary contact</td></tr>
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
          ${customSection}
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

/**
 * Send a passwordless sign-in link via Resend. Used by NextAuth's email
 * provider as sendVerificationRequest override.
 *
 * Throws if RESEND_API_KEY is missing or Resend returns non-2xx — NextAuth
 * treats a throw as "email couldn't be sent" and shows the user an error.
 */
export async function sendMagicLinkEmail(
  to: string,
  magicLink: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not set");
  const from = emailFromAddress();
  const subject = "Sign in to Neuroid CRM";
  const html = renderMagicLinkEmail(magicLink, to);

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
    throw new Error(
      `Resend returned ${res.status}: ${body.slice(0, 300)}`,
    );
  }
}

/**
 * Invitation email — admin is adding a teammate to the workspace.
 */
export async function sendInviteEmail(params: {
  to: string;
  inviteUrl: string;
  inviterName: string | null;
  inviterEmail: string;
  role: "ADMIN" | "USER";
  appOrigin: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not set");
  const from = emailFromAddress();
  const subject = `${params.inviterName ?? params.inviterEmail} invited you to Neuroid CRM`;
  const html = renderInviteEmail(params);

  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from, to: params.to, subject, html }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Resend returned ${res.status}: ${body.slice(0, 300)}`,
    );
  }
}

function renderInviteEmail(p: {
  to: string;
  inviteUrl: string;
  inviterName: string | null;
  inviterEmail: string;
  role: "ADMIN" | "USER";
  appOrigin: string;
}): string {
  const inviter = p.inviterName
    ? `${p.inviterName} (${p.inviterEmail})`
    : p.inviterEmail;
  const roleLabel = p.role === "ADMIN" ? "Admin" : "Member";
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f7f8fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e6e8ec;border-radius:12px;overflow:hidden">
      <div style="padding:22px 24px;background:linear-gradient(135deg,#3b82f6 0%,#8b5cf6 60%,#ec4899 100%);color:#ffffff">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;opacity:0.85">You're invited</div>
        <div style="font-size:20px;font-weight:700;margin-top:4px">Join Neuroid CRM</div>
      </div>
      <div style="padding:22px 24px;color:#0f1419;font-size:14px;line-height:1.55">
        <p style="margin:0 0 14px 0">Hi,</p>
        <p style="margin:0 0 14px 0"><strong>${escapeHtml(inviter)}</strong> has invited you to join Neuroid CRM as a <strong>${roleLabel}</strong>.</p>
        <p style="margin:0 0 22px 0">
          <a href="${escapeHtml(p.inviteUrl)}"
             style="display:inline-block;padding:12px 22px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:700;box-shadow:0 6px 14px rgba(37,99,235,0.25)">
            Accept invite &amp; sign in →
          </a>
        </p>
        <p style="margin:0 0 10px 0;color:#6b7280;font-size:12px">Button not working? Copy and paste this link:</p>
        <p style="margin:0;word-break:break-all;background:#f7f8fa;border:1px solid #e6e8ec;border-radius:8px;padding:10px 12px;color:#374151;font-size:12px">${escapeHtml(p.inviteUrl)}</p>
        <p style="margin:22px 0 0 0;color:#6b7280;font-size:12px">This invite is valid for 7 days. If you don't know ${escapeHtml(p.inviterEmail)}, you can safely ignore this email.</p>
      </div>
      <div style="padding:12px 24px;border-top:1px solid #e6e8ec;color:#9ca3af;font-size:11px">
        Sent by Neuroid CRM
      </div>
    </div>
  </body>
</html>`;
}

function renderMagicLinkEmail(magicLink: string, to: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f7f8fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e6e8ec;border-radius:12px;overflow:hidden">
      <div style="padding:22px 24px;background:linear-gradient(135deg,#3b82f6 0%,#8b5cf6 60%,#ec4899 100%);color:#ffffff">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;opacity:0.85">Sign-in link</div>
        <div style="font-size:20px;font-weight:700;margin-top:4px">Neuroid CRM</div>
      </div>
      <div style="padding:22px 24px;color:#0f1419;font-size:14px;line-height:1.55">
        <p style="margin:0 0 14px 0">Hi,</p>
        <p style="margin:0 0 14px 0">Click the button below to securely sign in to Neuroid CRM as <strong>${escapeHtml(to)}</strong>. The link is valid for the next 30 minutes.</p>
        <p style="margin:0 0 22px 0">
          <a href="${escapeHtml(magicLink)}"
             style="display:inline-block;padding:12px 22px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:700;box-shadow:0 6px 14px rgba(37,99,235,0.25)">
            Sign in to Neuroid CRM →
          </a>
        </p>
        <p style="margin:0 0 10px 0;color:#6b7280;font-size:12px">Button not working? Copy and paste this link:</p>
        <p style="margin:0;word-break:break-all;background:#f7f8fa;border:1px solid #e6e8ec;border-radius:8px;padding:10px 12px;color:#374151;font-size:12px">${escapeHtml(magicLink)}</p>
        <p style="margin:22px 0 0 0;color:#6b7280;font-size:12px">If you didn't try to sign in, you can safely ignore this email — no account changes happen until someone clicks the button.</p>
      </div>
      <div style="padding:12px 24px;border-top:1px solid #e6e8ec;color:#9ca3af;font-size:11px">
        Sent by Neuroid CRM
      </div>
    </div>
  </body>
</html>`;
}
