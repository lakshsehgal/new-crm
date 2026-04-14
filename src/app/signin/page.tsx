import { signIn } from "@/lib/auth";

export default function SignInPage() {
  return (
    <div className="min-h-screen grid place-items-center bg-surface">
      <div className="card p-8 w-full max-w-sm">
        <h1 className="text-xl font-semibold">Welcome to new-crm</h1>
        <p className="text-sm text-muted mt-1">
          Sign in with your Google workspace account. We request Gmail access so
          the CRM can sync your inbox and send emails on your behalf.
        </p>
        <form
          className="mt-6"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/app" });
          }}
        >
          <button className="btn-primary w-full justify-center" type="submit">
            Continue with Google
          </button>
        </form>
      </div>
    </div>
  );
}
