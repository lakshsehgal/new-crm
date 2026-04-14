import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import SyncButton from "./SyncButton";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  const [emails, sync] = await Promise.all([
    db.email.findMany({
      where: { userId },
      orderBy: { sentAt: "desc" },
      take: 200,
      include: { contact: { include: { lead: true } } },
    }),
    db.gmailSync.findUnique({ where: { userId } }),
  ]);

  return (
    <div className="p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Inbox</h1>
          <p className="text-sm text-muted">
            {sync?.lastSyncedAt
              ? `Last synced ${new Date(sync.lastSyncedAt).toLocaleString()}`
              : "Not synced yet."}
          </p>
        </div>
        <SyncButton />
      </header>
      <div className="card overflow-hidden">
        <ul className="divide-y divide-border">
          {emails.length === 0 && (
            <li className="p-6 text-sm text-muted">No messages. Try syncing.</li>
          )}
          {emails.map((e) => {
            const company = e.contact?.lead?.name ?? "";
            return (
              <li key={e.id}>
                <Link
                  href={`/app/inbox/${e.id}`}
                  className="flex items-center gap-3 p-3 text-sm hover:bg-surface/60 transition-colors"
                >
                  <div className="w-48 truncate font-medium">
                    {e.fromName ?? e.fromEmail}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{e.subject}</div>
                    <div className="truncate text-muted">{e.snippet}</div>
                  </div>
                  <div className="w-40 text-right text-xs text-muted truncate">
                    {company}
                  </div>
                  <div className="w-32 text-right text-xs text-muted">
                    {new Date(e.sentAt).toLocaleDateString()}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
