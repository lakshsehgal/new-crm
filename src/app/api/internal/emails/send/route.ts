import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail, getRfcMessageId } from "@/lib/gmail";
import { dispatchWebhookAfter } from "@/lib/webhooks";
import { z } from "zod";

const Body = z.object({
  contactId: z.string().optional(),
  to: z.string().email().optional(),
  subject: z.string().min(1),
  bodyText: z.string().optional(),
  bodyHtml: z.string().optional(),
  /** Optional: reply into an existing Gmail thread */
  replyToEmailId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const data = Body.parse(await req.json());

  let to = data.to;
  let contactId = data.contactId;
  if (contactId && !to) {
    const c = await db.contact.findUnique({ where: { id: contactId } });
    to = c?.email ?? undefined;
  }
  if (!to) return Response.json({ error: "No recipient" }, { status: 400 });

  // Thread info when replying
  let threadId: string | null | undefined;
  let inReplyToRfcId: string | null = null;
  if (data.replyToEmailId) {
    const source = await db.email.findUnique({
      where: { id: data.replyToEmailId },
    });
    if (source) {
      threadId = source.threadId;
      if (source.gmailId) {
        inReplyToRfcId = await getRfcMessageId(user.id, source.gmailId);
      }
      if (!contactId && source.contactId) contactId = source.contactId;
    }
  }

  const result = await sendEmail(user.id, {
    to,
    subject: data.subject,
    bodyText: data.bodyText,
    bodyHtml: data.bodyHtml,
    threadId,
    inReplyToRfcId,
  });
  if (!result) return Response.json({ error: "Gmail not connected" }, { status: 400 });

  const record = await db.email.create({
    data: {
      gmailId: result.id,
      threadId: result.threadId,
      userId: user.id,
      contactId: contactId ?? null,
      fromEmail: user.email,
      fromName: user.name ?? null,
      toEmails: [to],
      subject: data.subject,
      bodyText: data.bodyText ?? null,
      bodyHtml: data.bodyHtml ?? null,
      direction: "outbound",
      sentAt: new Date(),
    },
  });
  dispatchWebhookAfter("EMAIL_SENT", record);
  return Response.json(record);
}
