"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User as UserIcon,
  Mail,
  KeyRound,
  Zap,
  Workflow,
  SlidersHorizontal,
  Plug,
  Shield,
} from "lucide-react";

export default function SettingsSidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname() ?? "";

  return (
    <aside className="border-r border-border bg-surface p-4 space-y-0.5 overflow-y-auto">
      <div className="label px-2 pb-2">Account</div>
      <NavLink
        href="/app/settings/profile"
        label="Profile"
        icon={<UserIcon size={13} />}
        active={pathname === "/app/settings/profile"}
      />
      <NavLink
        href="/app/settings/email"
        label="Email"
        icon={<Mail size={13} />}
        active={pathname === "/app/settings/email"}
      />
      <NavLink
        href="/app/settings/api-keys"
        label="API keys"
        icon={<KeyRound size={13} />}
        active={pathname === "/app/settings/api-keys"}
      />

      {isAdmin && (
        <>
          <div className="label px-2 pt-4 pb-2">Workspace</div>
          <NavLink
            href="/app/workflows"
            label="Workflows"
            icon={<Zap size={13} className="text-amber-500" />}
            active={pathname.startsWith("/app/workflows")}
          />
          <NavLink
            href="/app/admin/pipelines"
            label="Pipelines"
            icon={<Workflow size={13} />}
            active={pathname.startsWith("/app/admin/pipelines")}
          />
          <NavLink
            href="/app/admin/custom-fields"
            label="Custom fields"
            icon={<SlidersHorizontal size={13} />}
            active={pathname.startsWith("/app/admin/custom-fields")}
          />
          <NavLink
            href="/app/admin/webhooks"
            label="Webhooks"
            icon={<Plug size={13} />}
            active={pathname.startsWith("/app/admin/webhooks")}
          />
          <NavLink
            href="/app/admin/users"
            label="Users & roles"
            icon={<Shield size={13} />}
            active={pathname.startsWith("/app/admin/users")}
          />
        </>
      )}
    </aside>
  );
}

function NavLink({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors " +
        (active
          ? "bg-accentSoft text-accent font-medium"
          : "hover:bg-white text-ink")
      }
    >
      {icon && <span className="text-muted">{icon}</span>}
      <span>{label}</span>
    </Link>
  );
}
