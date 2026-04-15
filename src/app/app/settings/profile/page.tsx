import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import ProfileForm from "./ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const u = session.user as any;
  const user = await db.user.findUnique({
    where: { id: u.id },
    select: { id: true, name: true, email: true, image: true, title: true, role: true },
  });
  if (!user) redirect("/signin");

  return (
    <div className="max-w-2xl mx-auto p-8 fade-in">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Your profile</h1>
        <p className="text-sm text-muted mt-1">
          This is shown in the sidebar, on emails you send, and anywhere your
          name appears in the workspace.
        </p>
      </header>
      <ProfileForm
        initial={{
          name: user.name ?? "",
          email: user.email,
          image: user.image ?? "",
          title: user.title ?? "",
          role: user.role,
        }}
      />
    </div>
  );
}
