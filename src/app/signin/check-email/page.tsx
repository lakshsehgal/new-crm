import Link from "next/link";
import { Mail } from "lucide-react";

export default function CheckEmailPage() {
  return (
    <div className="min-h-screen grid place-items-center bg-surface p-4">
      <div className="card p-8 w-full max-w-sm shadow-pop text-center">
        <div className="mx-auto size-14 rounded-2xl bg-accentSoft text-accent grid place-items-center mb-4">
          <Mail size={26} />
        </div>
        <h1 className="text-lg font-semibold">Check your email</h1>
        <p className="text-sm text-muted mt-2 leading-relaxed">
          We sent a sign-in link to the address you entered. Click the
          button in that email within the next 30 minutes to continue.
        </p>
        <div className="mt-5 text-[12px] text-mutedSoft leading-relaxed">
          Didn&apos;t get anything in a minute? Check your spam folder, then
          try again with the same email.
        </div>
        <div className="mt-6">
          <Link href="/signin" className="btn w-full justify-center">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
