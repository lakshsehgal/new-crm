import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import {
  Inbox,
  Briefcase,
  Target,
  Users,
  Activity as ActivityIcon,
  Workflow,
  Shield,
  SlidersHorizontal,
  Plug,
  Key,
  LogOut,
  LayoutDashboard,
} from "lucide-react";
import { initials } from "@/lib/utils";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const u = session.user as any;
  const isAdmin = u.role === "ADMIN";

  return (
    <div className="min-h-screen grid grid-cols-[220px_1fr] bg-surface">
      <aside className="sidebar flex flex-col h-screen sticky top-0">
        <div className="px-3 pt-3 pb-3 border-b border-sidebar-border">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="size-8 rounded-full bg-sidebar-accent/30 text-white grid place-items-center text-[11px] font-semibold">
              {initials(u.name, u.email)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold truncate text-white">
                {u.name || u.email?.split("@")[0]}
              </div>
              <div className="text-[11px] text-sidebar-muted truncate">
                {isAdmin ? "Admin" : "Member"}
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          <SidebarLink href="/app" icon={<LayoutDashboard size={15} />} label="Dashboard" />
          <SidebarLink href="/app/inbox" icon={<Inbox size={15} />} label="Inbox" />
          <SidebarLink href="/app/leads" icon={<Target size={15} />} label="Leads" />
          <SidebarLink href="/app/contacts" icon={<Users size={15} />} label="Contacts" />
          <SidebarLink href="/app/opportunities" icon={<Briefcase size={15} />} label="Opportunities" />
          <SidebarLink href="/app/activities" icon={<ActivityIcon size={15} />} label="Activities" />

          {isAdmin && (
            <>
              <div className="section-label">Workspace</div>
              <SidebarLink href="/app/admin/pipelines" icon={<Workflow size={15} />} label="Pipelines" />
              <SidebarLink href="/app/admin/custom-fields" icon={<SlidersHorizontal size={15} />} label="Custom fields" />
              <SidebarLink href="/app/admin/webhooks" icon={<Plug size={15} />} label="Webhooks" />
              <SidebarLink href="/app/admin/users" icon={<Shield size={15} />} label="Users & roles" />
            </>
          )}
        </nav>

        <div className="border-t border-sidebar-border p-2 space-y-0.5">
          <SidebarLink href="/app/settings/api-keys" icon={<Key size={15} />} label="API keys" />
        </div>

        <div className="border-t border-sidebar-border px-3 py-2 flex items-center justify-end text-[12px] text-sidebar-muted">
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/signin" });
            }}
          >
            <button className="hover:text-white flex items-center gap-1.5" type="submit">
              <LogOut size={13} /> Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 bg-white">{children}</main>
    </div>
  );
}

function SidebarLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link href={href} className="nav-item">
      <span className="text-sidebar-muted">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
    </Link>
  );
}
