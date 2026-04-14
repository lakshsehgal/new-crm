import { db } from "@/lib/db";
import { formatMoney } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [contacts, leads, openOpps, wonValue, recentActivities] = await Promise.all([
    db.contact.count(),
    db.lead.count(),
    db.opportunity.count({ where: { closedAt: null } }),
    db.opportunity.aggregate({
      where: { stage: { isWon: true } },
      _sum: { value: true },
    }),
    db.activity.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { contact: true, opportunity: true },
    }),
  ]);

  const stats = [
    { label: "Contacts", value: contacts, href: "/app/contacts" },
    { label: "Leads", value: leads, href: "/app/leads" },
    { label: "Open opportunities", value: openOpps, href: "/app/opportunities" },
    {
      label: "Won revenue",
      value: formatMoney(wonValue._sum.value?.toString() ?? 0),
      href: "/app/opportunities",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted">A snapshot of what's moving.</p>
      </header>
      <div className="grid grid-cols-4 gap-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-4 hover:shadow-pop transition">
            <div className="label">{s.label}</div>
            <div className="text-2xl font-semibold mt-1">{s.value}</div>
          </Link>
        ))}
      </div>

      <section className="card">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="font-medium">Recent activity</h2>
          <Link className="btn-ghost" href="/app/activities">View all</Link>
        </div>
        <ul className="divide-y divide-border">
          {recentActivities.length === 0 && (
            <li className="p-4 text-sm text-muted">Nothing yet. Log a call, note or task.</li>
          )}
          {recentActivities.map((a) => (
            <li key={a.id} className="p-3 text-sm flex items-center gap-3">
              <span className="badge">{a.type}</span>
              <span className="truncate">{a.title}</span>
              <span className="ml-auto text-muted text-xs">
                {new Date(a.createdAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
