import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function InviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const session = await auth();
  const viewer = session?.user as
    | { id?: string; email?: string; name?: string }
    | undefined;

  if (!viewer?.id || !viewer.email) {
    // Not signed in — send them back to the invite page to sign in.
    redirect(`/invite/${token}`);
  }

  const invite = await db.invite.findUnique({ where: { token } });
  if (!invite) {
    return (
      <Shell title="Invite not found">
        <p className="text-sm text-muted">
          This invite link is invalid. Ask your workspace admin to send a
          fresh one.
        </p>
      </Shell>
    );
  }
  if (invite.revokedAt) {
    return (
      <Shell title="Invite revoked">
        <p className="text-sm text-muted">
          This invite was revoked by your workspace admin.
        </p>
      </Shell>
    );
  }
  if (invite.acceptedAt) {
    redirect("/app");
  }
  if (invite.expiresAt < new Date()) {
    return (
      <Shell title="Invite expired">
        <p className="text-sm text-muted">
          This invite expired. Ask your admin for a new one.
        </p>
      </Shell>
    );
  }
  if (invite.email.toLowerCase() !== viewer.email.toLowerCase()) {
    return (
      <Shell title="Email doesn't match">
        <p className="text-sm text-muted mb-4">
          This invite is for{" "}
          <strong className="text-ink">{invite.email}</strong>, but you&apos;re
          signed in as <strong className="text-ink">{viewer.email}</strong>.
          Sign out and sign back in with the invited address.
        </p>
        <Link href="/signin" className="btn-primary w-full justify-center">
          Back to sign in
        </Link>
      </Shell>
    );
  }

  // Consume the invite: promote role, mark accepted.
  await db.$transaction([
    db.user.update({
      where: { id: viewer.id },
      data: { role: invite.role },
    }),
    db.invite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    }),
  ]);

  redirect("/app");
}

function Shell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid place-items-center bg-surface p-4">
      <div className="card p-8 w-full max-w-sm shadow-pop">
        <div className="flex items-center gap-2.5 mb-5">
          <span className="size-9 rounded-xl overflow-hidden grid place-items-center bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/logo.png"
              alt=""
              className="size-9 object-contain"
            />
          </span>
          <div>
            <div className="text-[15px] font-bold tracking-tight">{title}</div>
            <div className="text-[11.5px] text-muted">Neuroid CRM</div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
