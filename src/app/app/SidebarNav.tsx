"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
} from "lucide-react";

export default function SidebarNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const view = searchParams?.get("view");

  // Opportunities: pipeline if no ?view=list, list if ?view=list
  const onOpps = pathname.startsWith("/app/opportunities");
  const isPipeline = onOpps && view !== "list";
  const isList = onOpps && view === "list";

  function active(href: string, exact = false): boolean {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav className="flex-1 overflow-y-auto px-2 pb-2 space-y-[2px]">
      <NavLink
        href="/app"
        icon={<LayoutDashboard size={15} />}
        label="Dashboard"
        active={active("/app", true)}
      />
      <NavLink
        href="/app/inbox"
        icon={<Inbox size={15} />}
        label="Inbox"
        active={active("/app/inbox")}
      />
      <NavLink
        href="/app/opportunities"
        icon={<Trophy size={15} className="text-amber-400/90" />}
        label="Opportunities"
        active={onOpps}
      />
      <NavSub
        href="/app/opportunities"
        label="Pipeline"
        active={isPipeline}
      />
      <NavSub
        href="/app/opportunities?view=list"
        label="List"
        active={isList}
      />
      <NavLink
        href="/app/leads"
        icon={<Target size={15} />}
        label="Leads"
        active={active("/app/leads")}
      />
      <NavLink
        href="/app/contacts"
        icon={<Users size={15} />}
        label="Contacts"
        active={active("/app/contacts")}
      />
      <NavLink
        href="/app/activities"
        icon={<ActivityIcon size={15} />}
        label="Activities"
        active={active("/app/activities")}
      />

      {isAdmin && (
        <>
          <div className="section-label">
            <span>Workspace</span>
          </div>
          <NavLink
            href="/app/admin/pipelines"
            icon={<Workflow size={15} />}
            label="Pipelines"
            active={active("/app/admin/pipelines")}
          />
          <NavLink
            href="/app/admin/custom-fields"
            icon={<SlidersHorizontal size={15} />}
            label="Custom fields"
            active={active("/app/admin/custom-fields")}
          />
          <NavLink
            href="/app/admin/webhooks"
            icon={<Plug size={15} />}
            label="Webhooks"
            active={active("/app/admin/webhooks")}
          />
          <NavLink
            href="/app/admin/users"
            icon={<Shield size={15} />}
            label="Users & roles"
            active={active("/app/admin/users")}
          />
        </>
      )}
    </nav>
  );
}

function NavLink({
  href,
  icon,
  label,
  badge,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  active?: boolean;
}) {
  return (
    <Link href={href} className={"nav-item " + (active ? "active" : "")}>
      <span className="ico">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {badge && <span className="unread">{badge}</span>}
    </Link>
  );
}

function NavSub({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link href={href} className={"nav-sub " + (active ? "active" : "")}>
      <span className="truncate">{label}</span>
    </Link>
  );
}
