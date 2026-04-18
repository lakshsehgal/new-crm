import { google, gmail_v1 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { db } from "@/lib/db";

export async function getGmailClient(userId: string): Promise<gmail_v1.Gmail | null> {
  const account = await db.account.findFirst({
    where: { userId, provider: "google" },
  });
  if (!account?.refresh_token) return null;

  const oauth2 = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  oauth2.setCredentials({
    refresh_token: account.refresh_token,
    access_token: account.access_token ?? undefined,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });

  oauth2.on("tokens", async (tokens) => {
    await db.account.update({
      where: { id: account.id },
      data: {
        access_token: tokens.access_token ?? account.access_token,
        expires_at: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : account.expires_at,
        id_token: tokens.id_token ?? account.id_token,
      },
    });
  });

  return google.gmail({ version: "v1", auth: oauth2 });
}

function header(m: gmail_v1.Schema$Message, name: string): string | undefined {
  return m.payload?.headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? undefined;
}

function parseAddress(raw?: string): { email: string; name?: string } {
  if (!raw) return { email: "" };
  const match = raw.match(/^\s*(?:"?([^"<]+?)"?\s*)?<([^>]+)>\s*$/);
  if (match) return { name: match[1]?.trim(), email: match[2]!.trim().toLowerCase() };
  return { email: raw.trim().toLowerCase() };
}

function parseAddressList(raw?: string): string[] {
  if (!raw) return [];
  return raw.split(",").map((a) => parseAddress(a).email).filter(Boolean);
}

function decode(b64url?: string | null): string {
  if (!b64url) return "";
  try {
    return Buffer.from(b64url.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  } catch {
    return "";
  }
}

function extractBody(payload?: gmail_v1.Schema$MessagePart): { text: string; html: string } {
  const out = { text: "", html: "" };
  if (!payload) return out;
  const stack: gmail_v1.Schema$MessagePart[] = [payload];
  while (stack.length) {
    const p = stack.pop()!;
    if (p.mimeType === "text/plain" && p.body?.data) out.text ||= decode(p.body.data);
    else if (p.mimeType === "text/html" && p.body?.data) out.html ||= decode(p.body.data);
    if (p.parts) stack.push(...p.parts);
  }
  return out;
}

/**
 * Ingest a single Gmail message into the Email table. Handles direction
 * correctly based on whether the current user is the sender, and matches the
 * email to a Contact by looking up the "other side" of the conversation
 * (From for inbound, each To/Cc for outbound).
 */
async function ingestMessage(
  gmail: gmail_v1.Gmail,
  userId: string,
  myEmail: string,
  ref: { id?: string | null },
): Promise<boolean> {
  if (!ref.id) return false;
  const full = await gmail.users.messages.get({ userId: "me", id: ref.id, format: "full" });
  const m = full.data;
  const from = parseAddress(header(m, "From"));
  const to = parseAddressList(header(m, "To"));
  const cc = parseAddressList(header(m, "Cc"));
  const subject = header(m, "Subject") ?? "(no subject)";
  const date = Number(m.internalDate ?? Date.now());
  const { text, html } = extractBody(m.payload);

  const isOutbound = myEmail && from.email === myEmail;
  const direction = isOutbound ? "outbound" : "inbound";

  // Contact match: pick the "other side" of the conversation
  const counterpartyEmails = isOutbound ? [...to, ...cc] : [from.email];
  let contactId: string | null = null;
  for (const addr of counterpartyEmails) {
    if (!addr) continue;
    const c = await db.contact.findFirst({
      where: { email: { equals: addr, mode: "insensitive" } },
      select: { id: true },
    });
    if (c) {
      contactId = c.id;
      break;
    }
  }

  await db.email.upsert({
    where: { gmailId: m.id! },
    update: {
      contactId: contactId ?? undefined,
      toEmails: [...to, ...cc],
      direction,
    },
    create: {
      gmailId: m.id!,
      threadId: m.threadId ?? null,
      userId,
      contactId,
      fromEmail: from.email,
      fromName: from.name ?? null,
      toEmails: [...to, ...cc],
      subject,
      snippet: m.snippet ?? null,
      bodyText: text || null,
      bodyHtml: html || null,
      direction,
      sentAt: new Date(date),
    },
  });
  return true;
}

/**
 * Sync recent mail for a user (both inbound and outbound). Messages older
 * than the last `max` are fetched on-demand via `syncEmailsForAddress`.
 */
export async function syncInbox(userId: string, max = 200): Promise<number> {
  const gmail = await getGmailClient(userId);
  if (!gmail) return 0;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  const myEmail = user?.email?.toLowerCase() ?? "";

  // No label filter: list returns both INBOX and SENT by default.
  // Exclude chats and drafts only.
  const list = await gmail.users.messages.list({
    userId: "me",
    maxResults: max,
    q: "-in:chats -in:drafts",
  });
  const messages = list.data.messages ?? [];
  let upserted = 0;

  for (const ref of messages) {
    try {
      if (await ingestMessage(gmail, userId, myEmail, ref)) upserted++;
    } catch (err) {
      console.error(`[gmail] ingest ${ref.id} failed:`, err);
    }
  }

  await db.gmailSync.upsert({
    where: { userId },
    create: { userId, lastSyncedAt: new Date() },
    update: { lastSyncedAt: new Date() },
  });

  return upserted;
}

/**
 * Fetch every email in the user's Gmail that involves a specific address
 * (either from: or to:). Used when opening a lead — pulls the full history
 * for each contact on-demand, so we're not bound by the last N synced msgs.
 */
export async function syncEmailsForAddress(
  userId: string,
  address: string,
  max = 100,
): Promise<number> {
  const gmail = await getGmailClient(userId);
  if (!gmail) return 0;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  const myEmail = user?.email?.toLowerCase() ?? "";

  const escaped = address.replace(/"/g, "");
  const list = await gmail.users.messages.list({
    userId: "me",
    maxResults: max,
    q: `from:${escaped} OR to:${escaped}`,
  });
  const messages = list.data.messages ?? [];
  let upserted = 0;

  for (const ref of messages) {
    try {
      if (await ingestMessage(gmail, userId, myEmail, ref)) upserted++;
    } catch (err) {
      console.error(`[gmail] ingest ${ref.id} failed:`, err);
    }
  }

  return upserted;
}

export async function sendEmail(
  userId: string,
  args: {
    to: string;
    subject: string;
    bodyText?: string;
    bodyHtml?: string;
    threadId?: string | null;
    inReplyToMessageId?: string | null;
    inReplyToRfcId?: string | null;
  },
): Promise<{ id: string; threadId: string } | null> {
  const gmail = await getGmailClient(userId);
  if (!gmail) return null;

  const headers: string[] = [
    `To: ${args.to}`,
    `Subject: ${args.subject}`,
    "MIME-Version: 1.0",
    args.bodyHtml
      ? 'Content-Type: text/html; charset="UTF-8"'
      : 'Content-Type: text/plain; charset="UTF-8"',
  ];
  if (args.inReplyToRfcId) {
    headers.push(`In-Reply-To: ${args.inReplyToRfcId}`);
    headers.push(`References: ${args.inReplyToRfcId}`);
  }
  const mime = [...headers, "", args.bodyHtml ?? args.bodyText ?? ""].join("\r\n");
  const raw = Buffer.from(mime).toString("base64url");

  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw,
      ...(args.threadId ? { threadId: args.threadId } : {}),
    },
  });
  return { id: res.data.id!, threadId: res.data.threadId! };
}

export async function getRfcMessageId(
  userId: string,
  gmailId: string,
): Promise<string | null> {
  const gmail = await getGmailClient(userId);
  if (!gmail) return null;
  const res = await gmail.users.messages.get({
    userId: "me",
    id: gmailId,
    format: "metadata",
    metadataHeaders: ["Message-Id", "Message-ID"],
  });
  return header(res.data, "Message-Id") ?? header(res.data, "Message-ID") ?? null;
}
