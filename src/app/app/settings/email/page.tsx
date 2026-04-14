import { auth, signIn } from "@/lib/auth";
import { db } from "@/lib/db";
import EmailTemplatesUI from "./EmailTemplatesUI";
import DisconnectButton from "./DisconnectButton";
import { CheckCircle2, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EmailSettingsPage() {
  const session = await auth();
  const userId = (session?.user as any).id;

  const [googleAccount, templates] = await Promise.all([
    db.account.findFirst({
      where: { userId, provider: "google" },
      select: { id: true, providerAccountId: true, scope: true },
    }),
    db.emailTemplate.findMany({ orderBy: { updatedAt: "desc" } }),
  ]);

  const connected = !!googleAccount;
  const hasGmailScopes =
    connected && googleAccount.scope?.includes("gmail.send");

  return (
    <div className="p-8 space-y-8 max-w-3xl fade-in">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Email</h1>
        <p className="text-sm text-muted mt-1">
          Connect your Gmail to send messages and sync conversations directly
          on leads, contacts and opportunities.
        </p>
      </header>

      {/* Gmail connection */}
      <section className="card p-5">
        <div className="flex items-start gap-3">
          <div
            className={
              "size-9 rounded-full grid place-items-center " +
              (connected ? "bg-emerald-50" : "bg-gray-100")
            }
          >
            {connected ? (
              <CheckCircle2 className="text-emerald-600" size={18} />
            ) : (
              <XCircle className="text-muted" size={18} />
            )}
          </div>
          <div className="flex-1">
            <div className="font-semibold">Gmail</div>
            <div className="text-sm text-muted mt-0.5">
              {connected
                ? `Connected as ${googleAccount.providerAccountId}${hasGmailScopes ? "" : " (missing Gmail scopes — reconnect to send email)"}`
                : "Not connected. Sign in with Google to send email and sync your inbox."}
            </div>
          </div>
          <div>
            {connected ? (
              <DisconnectButton />
            ) : (
              <form
                action={async () => {
                  "use server";
                  await signIn("google", { redirectTo: "/app/settings/email" });
                }}
              >
                <button className="btn-primary" type="submit">
                  Connect Gmail
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Templates */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold">Templates</h2>
            <p className="text-sm text-muted">
              Reusable snippets for common outreach. Use{" "}
              <code className="text-[12px] bg-surface px-1 rounded">{"{{firstName}}"}</code>,{" "}
              <code className="text-[12px] bg-surface px-1 rounded">{"{{company}}"}</code>,{" "}
              <code className="text-[12px] bg-surface px-1 rounded">{"{{myName}}"}</code>{" "}
              — they're replaced when you compose.
            </p>
          </div>
        </div>
        <EmailTemplatesUI
          initialTemplates={templates.map((t) => ({
            id: t.id,
            name: t.name,
            subject: t.subject,
            body: t.body,
          }))}
        />
      </section>
    </div>
  );
}
