import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import InboxThread from "./InboxThread";
import { ArrowLeft, Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InboxEmailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const me = session?.user as any;

  const email = await db.email.findUnique({
    where: { id },
    include: {
      contact: { include: { lead: true } },
    },
  });
  if (!email) notFound();

  // Thread: all emails sharing the same Gmail threadId
  const thread = email.threadId
    ? await db.email.findMany({
        where: { threadId: email.threadId },
        orderBy: { sentAt: "asc" },
        include: { contact: { include: { lead: true } } },
      })
    : [email];

  return (
    <div className="flex flex-col h-screen bg-surface">
      {/* Header */}
      <div className="h-14 border-b border-border px-5 flex items-center gap-3 bg-white flex-shrink-0">
        <Link
          href="/app/inbox"
          className="size-7 grid place-items-center rounded-md text-muted hover:bg-surface hover:text-ink"
          title="Back to inbox"
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate">{email.subject}</div>
          <div className="text-[12px] text-muted flex items-center gap-2 mt-0.5">
            <span>{thread.length} {thread.length === 1 ? "message" : "messages"}</span>
            {email.contact?.lead && (
              <>
                <span>·</span>
                <Link
                  href={`/app/leads/${email.contact.lead.id}`}
                  className="flex items-center gap-1 text-accent hover:underline"
                >
                  <Building2 size={11} /> {email.contact.lead.name}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          <InboxThread
            messages={thread.map((m) => ({
              id: m.id,
              direction: m.direction,
              fromEmail: m.fromEmail,
              fromName: m.fromName,
              toEmails: m.toEmails,
              subject: m.subject,
              snippet: m.snippet,
              bodyText: m.bodyText,
              bodyHtml: m.bodyHtml,
              sentAt: m.sentAt.toISOString(),
              contactId: m.contactId,
              contactName: m.contact
                ? [m.contact.firstName, m.contact.lastName].filter(Boolean).join(" ") || m.contact.email
                : null,
            }))}
            myEmail={me?.email ?? ""}
          />
        </div>
      </div>
    </div>
  );
}
