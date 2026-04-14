import { signIn, authProviders } from "@/lib/auth";

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const error = params.error;
  return (
    <div className="min-h-screen grid place-items-center bg-surface">
      <div className="card p-8 w-full max-w-sm">
        <h1 className="text-xl font-semibold">Welcome to new-crm</h1>
        <p className="text-sm text-muted mt-1">
          Sign in to continue.
        </p>

        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">
            {error === "CredentialsSignin"
              ? "Invalid email or password."
              : `Sign-in failed: ${error}`}
          </div>
        )}

        {authProviders.dev && (
          <form
            className="mt-6 space-y-3"
            action={async (fd: FormData) => {
              "use server";
              await signIn("dev", {
                email: String(fd.get("email") ?? ""),
                password: String(fd.get("password") ?? ""),
                redirectTo: "/app",
              });
            }}
          >
            <label className="block">
              <span className="label">Email</span>
              <input className="input mt-1" name="email" type="email" required />
            </label>
            <label className="block">
              <span className="label">Password</span>
              <input className="input mt-1" name="password" type="password" required />
            </label>
            <button className="btn-primary w-full justify-center" type="submit">
              Sign in
            </button>
          </form>
        )}

        {authProviders.google && authProviders.dev && (
          <div className="my-5 flex items-center gap-3">
            <div className="h-px bg-border flex-1" />
            <span className="text-xs text-muted">or</span>
            <div className="h-px bg-border flex-1" />
          </div>
        )}

        {authProviders.google && (
          <form
            className={authProviders.dev ? "" : "mt-6"}
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/app" });
            }}
          >
            <button className="btn w-full justify-center" type="submit">
              Continue with Google
            </button>
            <p className="text-xs text-muted mt-2">
              Google is required to sync Gmail and send email from the CRM.
            </p>
          </form>
        )}

        {!authProviders.google && !authProviders.dev && (
          <div className="mt-6 text-sm text-muted">
            No sign-in methods are configured. Set either <code>GOOGLE_CLIENT_ID</code>/
            <code>GOOGLE_CLIENT_SECRET</code> or <code>DEV_LOGIN_PASSWORD</code> in your env.
          </div>
        )}
      </div>
    </div>
  );
}
