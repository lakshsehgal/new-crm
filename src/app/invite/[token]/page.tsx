import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn, authProviders } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

async function handleMagicSignIn(email: string, token: string): Promise<never> {
  try {
    await signIn("resend", {
      email,
      redirectTo: `/invite/${token}/accept`,
    });
    redirect("/signin");
  } catch (err) {
    if (err instanceof AuthError) {
      redirect(`/invite/${token}?error=${encodeURIComponent(err.type)}`);
    }
    throw err;
  }
}

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const sp = (await searchParams) ?? {};

  const invite = await db.invite.findUnique({
    where: { token },
    include: { invitedBy: { select: { email: true, name: true } } },
  });

  // Graceful states
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
          This invite has been revoked. Ask your workspace admin to send a
          fresh one.
        </p>
      </Shell>
    );
  }
  if (invite.acceptedAt) {
    return (
      <Shell title="Invite already accepted">
        <p className="text-sm text-muted mb-4">
          This invite has already been used. If that was you, just sign in.
        </p>
        <Link href="/signin" className="btn-primary w-full justify-center">
          Go to sign in
        </Link>
      </Shell>
    );
  }
  if (invite.expiresAt < new Date()) {
    return (
      <Shell title="Invite expired">
        <p className="text-sm text-muted">
          This invite expired on{" "}
          {invite.expiresAt.toLocaleDateString()}. Ask for a fresh one.
        </p>
      </Shell>
    );
  }

  // If the visitor is already signed in with the invited email, take them
  // straight to /accept which finalizes the role assignment.
  const session = await auth();
  const viewerEmail = (session?.user as { email?: string } | undefined)?.email?.toLowerCase();
  if (viewerEmail === invite.email.toLowerCase()) {
    redirect(`/invite/${token}/accept`);
  }

  const inviterLabel =
    invite.invitedBy?.name ??
    invite.invitedBy?.email ??
    "A workspace admin";

  return (
    <Shell title="You're invited to Neuroid CRM">
      <p className="text-sm text-muted mb-4">
        <strong className="text-ink">{inviterLabel}</strong> invited{" "}
        <strong className="text-ink">{invite.email}</strong> to join as a{" "}
        <strong className="text-ink">
          {invite.role === "ADMIN" ? "workspace admin" : "member"}
        </strong>
        .
      </p>

      {sp.error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">
          Couldn&apos;t send the sign-in email. Please try again.
        </div>
      )}

      {authProviders.email ? (
        <form
          action={async () => {
            "use server";
            await handleMagicSignIn(invite.email, token);
          }}
        >
          <button className="btn-primary w-full justify-center" type="submit">
            Email me a sign-in link
          </button>
          <p className="text-[11.5px] text-muted mt-2 text-center">
            We&apos;ll send a one-click sign-in to {invite.email}. No password
            needed.
          </p>
        </form>
      ) : (
        <p className="text-sm text-muted">
          Passwordless email isn&apos;t configured on this workspace. Ask your
          admin.
        </p>
      )}

      {authProviders.google && (
        <>
          <div className="my-4 flex items-center gap-3">
            <div className="h-px bg-border flex-1" />
            <span className="text-[11px] text-muted uppercase tracking-wider">
              or
            </span>
            <div className="h-px bg-border flex-1" />
          </div>
          <form
            action={async () => {
              "use server";
              try {
                await signIn("google", {
                  redirectTo: `/invite/${token}/accept`,
                });
              } catch (err) {
                if (err instanceof AuthError) {
                  redirect(`/invite/${token}?error=${encodeURIComponent(err.type)}`);
                }
                throw err;
              }
            }}
          >
            <button className="btn w-full justify-center" type="submit">
              Continue with Google
            </button>
            <p className="text-[11.5px] text-muted mt-2 text-center">
              Must sign in with the email {invite.email}.
            </p>
          </form>
        </>
      )}
    </Shell>
  );
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
