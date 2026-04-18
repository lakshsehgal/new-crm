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
  Filter,
  Plus,
  Pin,
  CheckSquare,
} from "lucide-react";
import BookmarksSection from "./BookmarksSection";

type PinnedView = {
  id: string;
  name: string;
};

type Bookmark = {
  id: string;
  title: string;
  url: string;
  folder: string | null;
};

export default function SidebarNav({
  pinnedViews,
  overdueTaskCount,
  bookmarks,
}: {
  pinnedViews?: PinnedView[];
  overdueTaskCount?: number;
  bookmarks?: Bookmark[];
}) {
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

  const views = pinnedViews ?? [];

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
      <NavLink
        href="/app/tasks"
        icon={<CheckSquare size={15} className="text-rose-400/90" />}
        label="Tasks"
        active={active("/app/tasks")}
        badge={overdueTaskCount && overdueTaskCount > 0 ? String(overdueTaskCount) : undefined}
      />

      {/* Smart Views section */}
      <div className="section-label">
        <span>Smart Views</span>
        <Link
          href="/app/smart-views/new"
          className="size-5 grid place-items-center rounded text-sidebar-muted hover:text-white"
          title="New smart view"
        >
          <Plus size={12} />
        </Link>
      </div>
      <NavLink
        href="/app/smart-views"
        icon={<Filter size={15} className="text-indigo-400/90" />}
        label="All Views"
        active={active("/app/smart-views", true)}
      />
      {views.map((v) => (
        <NavSub
          key={v.id}
          href={`/app/smart-views/${v.id}`}
          label={v.name}
          active={pathname === `/app/smart-views/${v.id}`}
        />
      ))}

      {/* Bookmarks section */}
      <BookmarksSection bookmarks={bookmarks ?? []} />
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
