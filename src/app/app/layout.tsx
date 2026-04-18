import { redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  LifeBuoy,
  Settings as SettingsIcon,
  LogOut,
} from "lucide-react";
import { initials } from "@/lib/utils";
import GlobalSearch from "@/components/GlobalSearch";
import BrandLogo from "@/components/BrandLogo";
import SidebarNav from "./SidebarNav";
import AppShell from "./AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const sessionUser = session.user as any;
  const me = await db.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, name: true, email: true, image: true, title: true, role: true },
  });
  if (!me) redirect("/signin");
  const isAdmin = me.role === "ADMIN";
  const displayName = me.name || me.email.split("@")[0];
  const roleLabel = me.title || (isAdmin ? "Workspace admin" : "Member");

  // Sidebar data: pinned smart views + overdue task count + bookmarks
  const [pinnedViews, overdueTaskCount, bookmarks] = await Promise.all([
    db.smartView.findMany({
      where: { ownerId: me.id, pinned: true },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true },
    }),
    db.activity.count({
      where: {
        type: "TASK",
        completedAt: null,
        dueAt: { lt: new Date() },
        OR: [{ assigneeId: me.id }, { userId: me.id }],
      },
    }),
    db.bookmark.findMany({
      where: { ownerId: me.id },
      orderBy: [{ folder: "asc" }, { order: "asc" }, { createdAt: "asc" }],
      select: { id: true, title: true, url: true, folder: true },
    }),
  ]);

  const sidebar = (
    <>
      <div className="px-3 pt-3.5 pb-3">
        <Link href="/app" className="brand-row" aria-label="Home">
          <BrandLogo className="brand-logo-img" />
        </Link>
      </div>

      <Suspense fallback={<div className="flex-1" />}>
        <SidebarNav
          isAdmin={isAdmin}
          pinnedViews={pinnedViews}
          overdueTaskCount={overdueTaskCount}
          bookmarks={bookmarks}
        />
      </Suspense>

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

      <div className="profile-dock">
        <Link
          href="/app/settings/profile"
          className="profile-dock-main"
          title="Edit your profile"
        >
          {me.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={me.image}
              alt=""
              className="size-8 rounded-full object-cover border border-sidebar-border"
            />
          ) : (
            <div className="size-8 rounded-full bg-white text-sidebar-bg grid place-items-center text-[11px] font-semibold shadow-sm">
              {initials(me.name, me.email)}
            </div>
          )}
          <div className="min-w-0 flex-1 profile-info">
            <div className="text-[13px] font-semibold truncate text-white leading-tight">
              {displayName}
            </div>
            <div className="text-[11px] text-sidebar-muted truncate leading-tight mt-0.5">
              {roleLabel}
            </div>
          </div>
        </Link>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/signin" });
          }}
          className="profile-info"
        >
          <button
            className="signout-btn"
            type="submit"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={12} />
          </button>
        </form>
      </div>
    </>
  );

  return (
    <AppShell sidebar={sidebar}>
      <header className="h-12 border-b border-border flex items-center px-4 flex-shrink-0 bg-white/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/70 sticky top-0 z-20">
        <Suspense fallback={null}>
          <GlobalSearch />
        </Suspense>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
    </AppShell>
  );
}
