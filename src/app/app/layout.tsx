import { redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import {
  LifeBuoy,
  Settings as SettingsIcon,
  ChevronsLeft,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { initials } from "@/lib/utils";
import GlobalSearch from "@/components/GlobalSearch";
import SidebarNav from "./SidebarNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const u = session.user as any;
  const isAdmin = u.role === "ADMIN";

  return (
    <div className="min-h-screen grid grid-cols-[220px_1fr] bg-surface">
      <aside className="sidebar flex flex-col h-screen sticky top-0">
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

        <Suspense fallback={<div className="flex-1" />}>
          <SidebarNav isAdmin={isAdmin} />
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

      <main className="min-w-0 bg-white flex flex-col">
        <header className="h-12 border-b border-border flex items-center px-4 flex-shrink-0 bg-white">
          <Suspense fallback={null}>
            <GlobalSearch />
          </Suspense>
        </header>
        <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
