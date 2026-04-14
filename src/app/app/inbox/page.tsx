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
      include: { contact: true },
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
          {emails.map((e) => (
            <li key={e.id} className="p-3 text-sm flex items-center gap-3">
              <div className="w-40 truncate">{e.fromName ?? e.fromEmail}</div>
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">{e.subject}</div>
                <div className="truncate text-muted">{e.snippet}</div>
              </div>
              <div className="w-40 text-right text-xs text-muted">
                {e.contact ? [e.contact.firstName, e.contact.lastName].filter(Boolean).join(" ") : ""}
              </div>
              <div className="w-32 text-right text-xs text-muted">
                {new Date(e.sentAt).toLocaleDateString()}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
