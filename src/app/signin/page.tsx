import Link from "next/link";
import { signIn, authProviders } from "@/lib/auth";

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const error = params.error;
  return (
    <div className="min-h-screen grid place-items-center bg-surface p-4">
      <div className="card p-8 w-full max-w-sm shadow-pop">
        {/* Brand */}
        <div className="flex items-center gap-2.5 mb-5">
          <span className="size-9 rounded-xl overflow-hidden grid place-items-center bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/logo.svg" alt="" className="size-9 object-cover" />
          </span>
          <div>
            <div className="text-[15px] font-bold tracking-tight">Neuroid CRM</div>
            <div className="text-[11.5px] text-muted">Sign in to continue</div>
          </div>
        </div>

        {error && (
          <div className="mt-1 mb-4 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">
            {error === "CredentialsSignin"
              ? "Invalid email or password."
              : error === "EmailSignin"
                ? "Couldn't send the sign-in email. Double-check the address and try again."
                : error === "Verification"
                  ? "That sign-in link has expired or already been used. Request a fresh one below."
                  : `Sign-in failed: ${error}`}
          </div>
        )}

        {/* Primary: Google OAuth (required for Gmail features) */}
        {authProviders.google && (
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/app" });
            }}
          >
            <button className="btn-primary w-full justify-center" type="submit">
              Continue with Google
            </button>
            <p className="text-[11.5px] text-muted mt-2 text-center">
              Required for Gmail sync & sending email from the CRM.
            </p>
          </form>
        )}

        {/* Magic link (passwordless) */}
        {authProviders.email && (
          <>
            {authProviders.google && (
              <div className="my-5 flex items-center gap-3">
                <div className="h-px bg-border flex-1" />
                <span className="text-[11px] text-muted uppercase tracking-wider">or</span>
                <div className="h-px bg-border flex-1" />
              </div>
            )}
            <form
              className="space-y-3"
              action={async (fd: FormData) => {
                "use server";
                await signIn("resend", {
                  email: String(fd.get("email") ?? "").trim().toLowerCase(),
                  redirectTo: "/app",
                });
              }}
            >
              <label className="block">
                <span className="label">Email me a sign-in link</span>
                <input
                  className="input mt-1.5"
                  name="email"
                  type="email"
                  placeholder="you@yourcompany.com"
                  required
                  autoComplete="email"
                />
              </label>
              <button className="btn w-full justify-center" type="submit">
                Send sign-in link
              </button>
              <p className="text-[11.5px] text-muted text-center">
                Forgot your password? We don&apos;t use passwords — just enter your
                email and we&apos;ll send you a secure sign-in link.
              </p>
            </form>
          </>
        )}

        {/* Dev credentials fallback — only shown when DEV_LOGIN_PASSWORD is set */}
        {authProviders.dev && (
          <>
            <div className="my-5 flex items-center gap-3">
              <div className="h-px bg-border flex-1" />
              <span className="text-[11px] text-muted uppercase tracking-wider">dev only</span>
              <div className="h-px bg-border flex-1" />
            </div>
            <details className="text-[12px] text-muted">
              <summary className="cursor-pointer select-none">Sign in with shared dev password</summary>
              <form
                className="mt-3 space-y-3"
                action={async (fd: FormData) => {
                  "use server";
                  await signIn("dev", {
                    email: String(fd.get("email") ?? ""),
                    password: String(fd.get("password") ?? ""),
                    redirectTo: "/app",
                  });
                }}
              >
                <input className="input" name="email" type="email" placeholder="Email" required />
                <input className="input" name="password" type="password" placeholder="Shared dev password" required />
                <button className="btn w-full justify-center" type="submit">
                  Dev sign in
                </button>
              </form>
            </details>
          </>
        )}

        {!authProviders.google && !authProviders.email && !authProviders.dev && (
          <div className="mt-6 text-sm text-muted">
            No sign-in methods are configured. Set{" "}
            <code>GOOGLE_CLIENT_ID</code> / <code>GOOGLE_CLIENT_SECRET</code> or{" "}
            <code>RESEND_API_KEY</code> in your env.
          </div>
        )}

        <p className="text-[11px] text-mutedSoft mt-6 text-center">
          By signing in you agree to your workspace&apos;s terms.
          <br />
          <Link href="/" className="hover:underline">Back to home</Link>
        </p>
      </div>
    </div>
  );
}
