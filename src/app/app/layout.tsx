import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import {
  Inbox,
  Briefcase,
  Target,
  Users,
  Activity as ActivityIcon,
  MessageSquare,
  Workflow,
  BarChart3,
  Search,
  LifeBuoy,
  Plug,
  Settings,
  ChevronsLeft,
  LogOut,
  Star,
  Bookmark,
} from "lucide-react";
import { initials } from "@/lib/utils";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const u = session.user as any;
  const isAdmin = u.role === "ADMIN";

  return (
    <div className="min-h-screen grid grid-cols-[232px_1fr] bg-surface">
      <aside className="sidebar flex flex-col h-screen sticky top-0">
        {/* Profile block */}
        <div className="px-3 pt-3 pb-4 border-b border-sidebar-border">
          <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-hover">
            <div className="size-8 rounded-full bg-sidebar-accent/30 text-white grid place-items-center text-[11px] font-semibold">
              {initials(u.name, u.email)}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <div className="text-[13px] font-semibold truncate text-white">
                {u.name || u.email?.split("@")[0]}
              </div>
              <div className="text-[11px] text-sidebar-muted truncate">
                {isAdmin ? "Admin" : "Member"}
              </div>
            </div>
            <ChevronsLeft size={14} className="text-sidebar-muted rotate-180" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          <SidebarLink href="/app/inbox" icon={<Inbox size={15} />} label="Inbox" badge="46" />
          <SidebarLink href="/app/opportunities" icon={<Briefcase size={15} />} label="Opportunities" />
          <div className="ml-0">
            <SidebarSub href="/app/opportunities" label="Pipeline" />
            <SidebarSub href="/app/opportunities?view=list" label="List" />
          </div>
          <SidebarLink href="/app/leads" icon={<Target size={15} />} label="Leads" />
          <SidebarLink href="/app/contacts" icon={<Users size={15} />} label="Contacts" />
          <SidebarLink href="/app/activities" icon={<ActivityIcon size={15} />} label="Activities" />
          <SidebarLink href="/app" icon={<MessageSquare size={15} />} label="Dashboard" />

          {isAdmin && (
            <>
              <div className="section-label">Workspace</div>
              <SidebarLink href="/app/admin/pipelines" icon={<Workflow size={15} />} label="Pipelines" />
              <SidebarLink href="/app/admin/custom-fields" icon={<BarChart3 size={15} />} label="Custom fields" />
            </>
          )}

          <div className="section-label flex items-center justify-between">
            <span>Smart views</span>
            <div className="flex gap-1">
              <button className="text-sidebar-muted hover:text-white"><Bookmark size={11} /></button>
              <button className="text-sidebar-muted hover:text-white"><Search size={11} /></button>
            </div>
          </div>
          <SidebarLink href="/app/leads" icon={<Star size={14} className="text-amber-400" />} label="Engagers — Leads" />
        </nav>

        <div className="border-t border-sidebar-border p-2 space-y-0.5">
          <SidebarLink href="https://github.com/lakshsehgal/new-crm" icon={<LifeBuoy size={15} />} label="Support & FAQs" external />
          <SidebarLink href="/app/settings/api-keys" icon={<Plug size={15} />} label="Integrations" />
          {isAdmin && <SidebarLink href="/app/admin/webhooks" icon={<Plug size={15} />} label="Webhooks" />}
          {isAdmin && <SidebarLink href="/app/admin/users" icon={<Settings size={15} />} label="Admin" />}
          <SidebarLink href="/app/settings/api-keys" icon={<Settings size={15} />} label="Settings" />
        </div>

        <div className="border-t border-sidebar-border px-3 py-2 flex items-center justify-between text-[12px] text-sidebar-muted">
          <button className="flex items-center gap-1.5 hover:text-white">
            <ChevronsLeft size={14} /> Collapse
          </button>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/signin" });
            }}
          >
            <button className="hover:text-white" type="submit" title="Sign out">
              <LogOut size={14} />
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
  badge,
  external,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  external?: boolean;
}) {
  const content = (
    <>
      <span className="text-sidebar-muted">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {badge && (
        <span className="ml-auto text-[10.5px] font-semibold bg-emerald-500/90 text-white rounded px-1.5 py-0.5">
          {badge}
        </span>
      )}
    </>
  );
  if (external) {
    return (
      <a href={href} className="nav-item" target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className="nav-item">
      {content}
    </Link>
  );
}

function SidebarSub({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="nav-sub">{label}</Link>
  );
}
