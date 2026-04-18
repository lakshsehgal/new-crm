import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import SettingsSidebar from "../settings/SettingsSidebar";

export default async function WorkflowsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const me = await db.user.findUnique({
    where: { id: (session.user as any).id },
    select: { role: true },
  });
  if (me?.role !== "ADMIN") redirect("/app");

  return (
    <div className="grid grid-cols-[220px_1fr] h-full">
      <SettingsSidebar isAdmin />
      <main className="overflow-y-auto bg-white">{children}</main>
    </div>
  );
}
