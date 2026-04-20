import { db } from "@/lib/db";
import { formatMoney } from "@/lib/utils";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Trophy,
  Users,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Activity,
  BarChart3,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [
    totalLeads,
    leadsThisMonth,
    leadsLastMonth,
    totalContacts,
    leadsByStatus,
    leadsBySource,
    openOpps,
    totalPipelineAgg,
    wonAgg,
    wonThisMonth,
    wonLastMonth,
    lostCount,
    avgDealAgg,
    oppsByStage,
    overdueTasks,
    openTasks,
    recentWins,
    recentActivity,
    topLeads,
    activityStats,
  ] = await Promise.all([
    db.lead.count(),
    db.lead.count({ where: { createdAt: { gte: startOfMonth } } }),
    db.lead.count({
      where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
    }),
    db.contact.count(),
    db.lead.groupBy({ by: ["status"], _count: true }),
    db.lead.groupBy({ by: ["source"], _count: true }),
    db.opportunity.count({ where: { closedAt: null } }),
    db.opportunity.aggregate({
      where: { closedAt: null },
      _sum: { value: true },
    }),
    db.opportunity.aggregate({
      where: { stage: { isWon: true } },
      _sum: { value: true },
      _count: true,
    }),
    db.opportunity.aggregate({
      where: { stage: { isWon: true }, closedAt: { gte: startOfMonth } },
      _sum: { value: true },
      _count: true,
    }),
    db.opportunity.aggregate({
      where: {
        stage: { isWon: true },
        closedAt: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
      _sum: { value: true },
      _count: true,
    }),
    db.opportunity.count({ where: { stage: { isLost: true } } }),
    db.opportunity.aggregate({
      where: { stage: { isWon: true } },
      _avg: { value: true },
    }),
    db.pipelineStage.findMany({
      where: { pipeline: { isDefault: true } },
      orderBy: { order: "asc" },
      include: {
        opportunities: {
          where: { closedAt: null },
          select: { value: true },
        },
      },
    }),
    db.activity.count({
      where: {
        type: "TASK",
        completedAt: null,
        dueAt: { lt: now },
      },
    }),
    db.activity.count({
      where: { type: "TASK", completedAt: null },
    }),
    db.opportunity.findMany({
      where: { stage: { isWon: true } },
      orderBy: { closedAt: "desc" },
      take: 5,
      include: { lead: true, stage: true, owner: true },
    }),
    db.activity.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { lead: true, user: true },
    }),
    db.lead.findMany({
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: {
        opportunities: {
          where: { closedAt: null },
          select: { value: true },
        },
        contacts: { select: { id: true }, take: 1 },
      },
    }),
    db.activity.groupBy({
      by: ["type"],
      where: { createdAt: { gte: startOfMonth } },
      _count: true,
    }),
  ]);

  const pipelineValue = Number(totalPipelineAgg._sum.value ?? 0);
  const wonRevenue = Number(wonAgg._sum.value ?? 0);
  const wonCount = wonAgg._count ?? 0;
  const wonThisMonthVal = Number(wonThisMonth._sum.value ?? 0);
  const wonLastMonthVal = Number(wonLastMonth._sum.value ?? 0);
  const avgDeal = Number(avgDealAgg._avg.value ?? 0);
  const totalClosed = wonCount + lostCount;
  const winRate = totalClosed > 0 ? Math.round((wonCount / totalClosed) * 100) : 0;
  const leadsDelta = leadsThisMonth - leadsLastMonth;
  const revenueDelta = wonThisMonthVal - wonLastMonthVal;

  // Pipeline stage data
  const stageData = oppsByStage
    .filter((s) => !s.isWon && !s.isLost)
    .map((s) => {
      const count = s.opportunities.length;
      const value = s.opportunities.reduce((sum, o) => sum + Number(o.value), 0);
      return { name: s.name, count, value, probability: s.probability };
    });
  const maxStageValue = Math.max(...stageData.map((s) => s.value), 1);

  // Lead status data
  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    POTENTIAL: { label: "Potential", color: "bg-amber-400", bg: "bg-amber-50 text-amber-700" },
    QUALIFIED: { label: "Qualified", color: "bg-blue-400", bg: "bg-blue-50 text-blue-700" },
    INTERESTED: { label: "Interested", color: "bg-violet-400", bg: "bg-violet-50 text-violet-700" },
    CUSTOMER: { label: "Customer", color: "bg-emerald-400", bg: "bg-emerald-50 text-emerald-700" },
    BAD_FIT: { label: "Bad Fit", color: "bg-rose-400", bg: "bg-rose-50 text-rose-700" },
    CHURNED: { label: "Churned", color: "bg-gray-400", bg: "bg-gray-100 text-gray-600" },
  };

  const activityMap = Object.fromEntries(
    activityStats.map((a) => [a.type, a._count]),
  );

  return (
    <div className="p-6 space-y-6 fade-in">
      <header>
        <h1 className="text-xl font-semibold">Sales Dashboard</h1>
        <p className="text-sm text-muted">
          {now.toLocaleDateString("en-US", { month: "long", year: "numeric" })} overview
        </p>
      </header>

      {/* ─── KPI Cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Pipeline Value"
          value={formatMoney(pipelineValue)}
          sub={`${openOpps} open deals`}
          icon={<BarChart3 size={16} />}
          iconBg="bg-blue-50 text-blue-600"
          href="/app/opportunities"
        />
        <KpiCard
          label="Won Revenue"
          value={formatMoney(wonRevenue)}
          sub={`${wonCount} deals closed`}
          icon={<Trophy size={16} />}
          iconBg="bg-emerald-50 text-emerald-600"
          delta={revenueDelta}
          deltaLabel="vs last month"
          href="/app/opportunities"
        />
        <KpiCard
          label="Win Rate"
          value={`${winRate}%`}
          sub={`${wonCount}W / ${lostCount}L of ${totalClosed}`}
          icon={<TrendingUp size={16} />}
          iconBg="bg-amber-50 text-amber-600"
        />
        <KpiCard
          label="Avg Deal Size"
          value={formatMoney(avgDeal)}
          sub="across won deals"
          icon={<DollarSign size={16} />}
          iconBg="bg-violet-50 text-violet-600"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Leads"
          value={totalLeads}
          sub={`${leadsThisMonth} this month`}
          icon={<Target size={16} />}
          iconBg="bg-indigo-50 text-indigo-600"
          delta={leadsDelta}
          deltaLabel="vs last month"
          href="/app/leads"
        />
        <KpiCard
          label="Contacts"
          value={totalContacts}
          icon={<Users size={16} />}
          iconBg="bg-cyan-50 text-cyan-600"
          href="/app/contacts"
        />
        <KpiCard
          label="Open Tasks"
          value={openTasks}
          sub={overdueTasks > 0 ? `${overdueTasks} overdue` : "none overdue"}
          icon={overdueTasks > 0 ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          iconBg={overdueTasks > 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}
          href="/app/tasks"
        />
        <KpiCard
          label="Activities This Month"
          value={activityStats.reduce((s, a) => s + a._count, 0)}
          sub={[
            activityMap.CALL ? `${activityMap.CALL} calls` : null,
            activityMap.MEETING ? `${activityMap.MEETING} meetings` : null,
            activityMap.EMAIL ? `${activityMap.EMAIL} emails` : null,
          ]
            .filter(Boolean)
            .join(", ") || "no activity yet"}
          icon={<Activity size={16} />}
          iconBg="bg-orange-50 text-orange-600"
          href="/app/activities"
        />
      </div>

      {/* ─── Pipeline + Lead Status ─── */}
      <div className="grid grid-cols-[1fr_340px] gap-4">
        {/* Pipeline by stage */}
        <div className="card">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-sm">Pipeline by Stage</h2>
            <Link href="/app/opportunities" className="btn-ghost text-[12px]">
              View pipeline <ArrowRight size={12} />
            </Link>
          </div>
          <div className="p-4 space-y-3">
            {stageData.length === 0 ? (
              <p className="text-sm text-muted py-4 text-center">
                No pipeline stages configured.
              </p>
            ) : (
              stageData.map((s) => (
                <div key={s.name}>
                  <div className="flex items-center justify-between text-[13px] mb-1">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-muted">
                      {s.count} deal{s.count !== 1 ? "s" : ""} ·{" "}
                      {formatMoney(s.value)} · {s.probability}%
                    </span>
                  </div>
                  <div className="h-2 bg-surface rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all"
                      style={{
                        width: `${Math.max((s.value / maxStageValue) * 100, 2)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
            {stageData.length > 0 && (
              <div className="pt-2 border-t border-border flex items-center justify-between text-[13px] font-semibold">
                <span>Total pipeline</span>
                <span>
                  {stageData.reduce((s, d) => s + d.count, 0)} deals ·{" "}
                  {formatMoney(pipelineValue)} ·{" "}
                  Weighted:{" "}
                  {formatMoney(
                    stageData.reduce(
                      (s, d) => s + d.value * (d.probability / 100),
                      0,
                    ),
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Lead status breakdown */}
        <div className="card">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-semibold text-sm">Lead Status</h2>
          </div>
          <div className="p-4 space-y-2">
            {leadsByStatus.map((g) => {
              const cfg = statusConfig[g.status] ?? {
                label: g.status,
                color: "bg-gray-300",
                bg: "",
              };
              const pct = totalLeads > 0 ? (g._count / totalLeads) * 100 : 0;
              return (
                <div key={g.status} className="flex items-center gap-2">
                  <span className={`badge ${cfg.bg} !text-[10px] w-20 justify-center`}>
                    {cfg.label}
                  </span>
                  <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
                    <div
                      className={`h-full ${cfg.color} rounded-full`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  <span className="text-[12px] text-muted w-12 text-right">
                    {g._count}
                  </span>
                </div>
              );
            })}
            {leadsBySource.length > 0 && (
              <>
                <div className="border-t border-border pt-2 mt-2" />
                <div className="text-[11px] font-bold uppercase tracking-wide text-muted mb-1">
                  By source
                </div>
                {leadsBySource.map((g) => (
                  <div
                    key={g.source}
                    className="flex items-center justify-between text-[13px]"
                  >
                    <span
                      className={
                        "badge !text-[10px] " +
                        (g.source === "API"
                          ? "bg-cyan-50 text-cyan-700 border-cyan-200"
                          : "bg-gray-50 text-gray-600 border-gray-200")
                      }
                    >
                      {g.source === "API" ? "API" : "Manual"}
                    </span>
                    <span className="text-muted">{g._count}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── Recent Wins + Top Leads ─── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Recent wins */}
        <div className="card">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-sm flex items-center gap-1.5">
              <Trophy size={14} className="text-emerald-500" />
              Recent Wins
            </h2>
          </div>
          {recentWins.length === 0 ? (
            <div className="p-4 text-sm text-muted text-center">
              No deals won yet.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recentWins.map((o) => (
                <li key={o.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                  <div className="w-1 h-8 rounded-sm bg-emerald-400" />
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/app/opportunities/${o.id}`}
                      className="font-semibold text-accent hover:underline truncate block"
                    >
                      {o.name}
                    </Link>
                    <span className="text-[11px] text-muted">
                      {o.lead.name}
                      {o.closedAt &&
                        ` · ${new Date(o.closedAt).toLocaleDateString()}`}
                    </span>
                  </div>
                  <span className="font-semibold text-emerald-700">
                    {formatMoney(o.value.toString())}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Top leads by pipeline value */}
        <div className="card">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-sm flex items-center gap-1.5">
              <Target size={14} className="text-indigo-500" />
              Top Leads by Pipeline
            </h2>
            <Link href="/app/leads" className="btn-ghost text-[12px]">
              All leads <ArrowRight size={12} />
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {topLeads
              .map((l) => ({
                ...l,
                totalValue: l.opportunities.reduce(
                  (s, o) => s + Number(o.value),
                  0,
                ),
              }))
              .sort((a, b) => b.totalValue - a.totalValue)
              .slice(0, 5)
              .map((l) => (
                <li
                  key={l.id}
                  className="px-4 py-2.5 flex items-center gap-3 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/app/leads/${l.id}`}
                      className="font-semibold text-accent hover:underline truncate block"
                    >
                      {l.name}
                    </Link>
                    <span className="text-[11px] text-muted">
                      {l.opportunities.length} deal
                      {l.opportunities.length !== 1 ? "s" : ""} open
                    </span>
                  </div>
                  <span className="font-semibold">
                    {l.totalValue > 0 ? formatMoney(l.totalValue) : "—"}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      </div>

      {/* ─── Recent Activity ─── */}
      <div className="card">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-sm">Recent Activity</h2>
          <Link className="btn-ghost text-[12px]" href="/app/activities">
            View all <ArrowRight size={12} />
          </Link>
        </div>
        <ul className="divide-y divide-border">
          {recentActivity.length === 0 && (
            <li className="p-4 text-sm text-muted">
              Nothing yet. Create a lead to get started.
            </li>
          )}
          {recentActivity.map((a) => (
            <li
              key={a.id}
              className="p-3 text-sm flex items-center gap-3"
            >
              <span className="badge">{a.type}</span>
              <span className="truncate flex-1">{a.title}</span>
              {a.lead && (
                <Link
                  href={`/app/leads/${a.lead.id}`}
                  className="text-accent text-xs hover:underline"
                >
                  {a.lead.name}
                </Link>
              )}
              <span className="text-muted text-xs whitespace-nowrap">
                {a.user?.name ?? a.user?.email ?? ""}
              </span>
              <span className="text-muted text-xs whitespace-nowrap">
                {relTime(a.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon,
  iconBg,
  delta,
  deltaLabel,
  href,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  iconBg: string;
  delta?: number;
  deltaLabel?: string;
  href?: string;
}) {
  const inner = (
    <div className="card p-4 flex items-start gap-3">
      <div className={`size-9 rounded-lg grid place-items-center ${iconBg} flex-shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="label">{label}</div>
        <div className="text-xl font-semibold mt-0.5">{value}</div>
        {(sub || delta !== undefined) && (
          <div className="flex items-center gap-2 mt-1">
            {delta !== undefined && delta !== 0 && (
              <span
                className={
                  "text-[11px] font-semibold flex items-center gap-0.5 " +
                  (delta > 0 ? "text-emerald-600" : "text-rose-600")
                }
              >
                {delta > 0 ? (
                  <TrendingUp size={11} />
                ) : (
                  <TrendingDown size={11} />
                )}
                {delta > 0 ? "+" : ""}
                {typeof value === "string" && value.startsWith("₹")
                  ? formatMoney(Math.abs(delta))
                  : Math.abs(delta)}
              </span>
            )}
            {sub && (
              <span className="text-[11px] text-muted truncate">{sub}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block hover:shadow-cardHover transition">
        {inner}
      </Link>
    );
  }
  return inner;
}

function relTime(d: Date): string {
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}
