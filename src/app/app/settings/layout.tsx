import Link from "next/link";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[220px_1fr] h-screen">
      <aside className="border-r border-border bg-surface p-4 space-y-0.5">
        <div className="label px-2 pb-2">Settings</div>
        <NavLink href="/app/settings/profile" label="Profile" />
        <NavLink href="/app/settings/email" label="Email" />
        <NavLink href="/app/settings/api-keys" label="API keys" />
      </aside>
      <main className="overflow-y-auto bg-white">{children}</main>
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block px-2 py-1.5 rounded-md text-sm hover:bg-white transition-colors"
    >
      {label}
    </Link>
  );
}
