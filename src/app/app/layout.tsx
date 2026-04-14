import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import {
  Inbox,
  Target,
  Users,
  Activity as ActivityIcon,
  LayoutDashboard,
  Trophy,
  Workflow,
  SlidersHorizontal,
  Plug,
  Shield,
  LifeBuoy,
  Settings as SettingsIcon,
  ChevronsLeft,
  ChevronDown,
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
      <aside className="sidebar flex flex-col h-screen sticky top-0">
        {/* Profile block */}
        <div className="px-2 pt-2 pb-2">
          <button className="profile-row w-full text-left">
            <div className="size-8 rounded-full bg-white text-sidebar-bg grid place-items-center text-[11px] font-semibold shadow-sm">
              {initials(u.name, u.email)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold truncate text-white leading-tight">
                {u.name || u.email?.split("@")[0]}
              </div>
              <div className="text-[11px] text-sidebar-muted truncate leading-tight mt-0.5">
                {isAdmin ? "Workspace admin" : "Member"}
              </div>
            </div>
            <ChevronDown size={13} className="text-sidebar-mutedSoft" />
          </button>
        </div>

        {/* Primary nav */}
        <nav className="flex-1 overflow-y-auto px-2 pb-2 space-y-[2px]">
          <NavLink href="/app" icon={<LayoutDashboard size={15} />} label="Dashboard" />
          <NavLink
            href="/app/inbox"
            icon={<Inbox size={15} />}
            label="Inbox"
            badge={/* future: real unread count */ undefined}
          />
          <NavLink
            href="/app/opportunities"
            icon={<Trophy size={15} className="text-amber-400/90" />}
            label="Opportunities"
          />
          <NavSub href="/app/opportunities" label="Pipeline" />
          <NavLink href="/app/leads" icon={<Target size={15} />} label="Leads" />
          <NavLink href="/app/contacts" icon={<Users size={15} />} label="Contacts" />
          <NavLink href="/app/activities" icon={<ActivityIcon size={15} />} label="Activities" />

          {isAdmin && (
            <>
              <div className="section-label">
                <span>Workspace</span>
              </div>
              <NavLink
                href="/app/admin/pipelines"
                icon={<Workflow size={15} />}
                label="Pipelines"
              />
              <NavLink
                href="/app/admin/custom-fields"
                icon={<SlidersHorizontal size={15} />}
                label="Custom fields"
              />
              <NavLink
                href="/app/admin/webhooks"
                icon={<Plug size={15} />}
                label="Webhooks"
              />
              <NavLink
                href="/app/admin/users"
                icon={<Shield size={15} />}
                label="Users & roles"
              />
            </>
          )}
        </nav>

        {/* Footer group */}
        <div className="px-2 py-2 border-t border-sidebar-border space-y-[2px]">
          <Link
            href="https://github.com/lakshsehgal/new-crm"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            <LifeBuoy size={14} />
            <span className="flex-1">Support &amp; FAQs</span>
          </Link>
          <Link href="/app/settings/email" className="footer-link">
            <SettingsIcon size={14} />
            <span className="flex-1">Settings</span>
          </Link>
        </div>

        {/* Collapse bar */}
        <div className="collapse-bar">
          <button className="flex items-center gap-1.5" type="button">
            <ChevronsLeft size={13} /> Collapse
          </button>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/signin" });
            }}
          >
            <button className="flex items-center gap-1" type="submit" title="Sign out">
              <LogOut size={12} />
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 bg-white">{children}</main>
    </div>
  );
}

function NavLink({
  href,
  icon,
  label,
  badge,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}) {
  return (
    <Link href={href} className="nav-item">
      <span className="ico">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {badge && <span className="unread">{badge}</span>}
    </Link>
  );
}

function NavSub({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="nav-sub">
      <span className="truncate">{label}</span>
    </Link>
  );
}
