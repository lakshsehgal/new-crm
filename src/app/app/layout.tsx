import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import {
  Users,
  Target,
  Briefcase,
  Activity as ActivityIcon,
  Inbox,
  Settings,
  LayoutDashboard,
  Shield,
  LogOut,
} from "lucide-react";
import { initials } from "@/lib/utils";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const u = session.user as any;
  const isAdmin = u.role === "ADMIN";

  return (
    <div className="min-h-screen grid grid-cols-[220px_1fr] bg-surface">
      <aside className="border-r border-border bg-white flex flex-col">
        <div className="px-4 py-4 border-b border-border">
          <div className="font-semibold tracking-tight">new-crm</div>
          <div className="text-xs text-muted">Internal CRM</div>
        </div>
        <nav className="p-2 flex-1 space-y-0.5 text-sm">
          <NavItem href="/app" icon={<LayoutDashboard size={16} />} label="Dashboard" />
          <NavItem href="/app/contacts" icon={<Users size={16} />} label="Contacts" />
          <NavItem href="/app/leads" icon={<Target size={16} />} label="Leads" />
          <NavItem href="/app/opportunities" icon={<Briefcase size={16} />} label="Opportunities" />
          <NavItem href="/app/activities" icon={<ActivityIcon size={16} />} label="Activities" />
          <NavItem href="/app/inbox" icon={<Inbox size={16} />} label="Inbox" />
          <div className="pt-3 px-2 pb-1 label">Account</div>
          <NavItem href="/app/settings/api-keys" icon={<Settings size={16} />} label="API Keys" />
          {isAdmin && (
            <>
              <div className="pt-3 px-2 pb-1 label">Admin</div>
              <NavItem href="/app/admin/users" icon={<Shield size={16} />} label="Users" />
              <NavItem href="/app/admin/custom-fields" icon={<Settings size={16} />} label="Custom fields" />
              <NavItem href="/app/admin/pipelines" icon={<Briefcase size={16} />} label="Pipelines" />
              <NavItem href="/app/admin/webhooks" icon={<ActivityIcon size={16} />} label="Webhooks" />
            </>
          )}
        </nav>
        <div className="border-t border-border p-3 flex items-center gap-2">
          <div className="size-7 rounded-full bg-accentSoft text-accent grid place-items-center text-xs font-medium">
            {initials(u.name, u.email)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm truncate">{u.name || u.email}</div>
            <div className="text-xs text-muted truncate">{u.role}</div>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/signin" });
            }}
          >
            <button className="btn-ghost" type="submit" aria-label="Sign out">
              <LogOut size={14} />
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  );
}

function NavItem({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface text-ink"
    >
      <span className="text-muted">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
