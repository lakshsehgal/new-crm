import Link from "next/link";
import { db } from "@/lib/db";
import NewLeadButton from "@/components/NewLeadButton";
import LeadsTable from "./LeadsTable";
import type { LeadStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_PILLS: { key: "ALL" | LeadStatus; label: string; style: string }[] = [
  { key: "ALL",       label: "All",       style: "" },
  { key: "POTENTIAL", label: "Potential", style: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "INTERESTED", label: "Interested", style: "bg-violet-50 text-violet-700 border-violet-200" },
  { key: "QUALIFIED", label: "Qualified", style: "bg-blue-50 text-blue-700 border-blue-200" },
  { key: "CUSTOMER",  label: "Customer",  style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { key: "BAD_FIT",   label: "Bad fit",   style: "bg-rose-50 text-rose-700 border-rose-200" },
  { key: "CHURNED",   label: "Churned",   style: "bg-gray-100 text-gray-600 border-gray-200" },
];

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const activeStatus = (status as LeadStatus | "ALL" | undefined) ?? "ALL";

  const leads = await db.lead.findMany({
    where: {
      ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
      ...(activeStatus !== "ALL" ? { status: activeStatus as LeadStatus } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: {
      contacts: { select: { id: true } },
      opportunities: {
        select: { id: true, value: true },
      },
      owner: { select: { email: true } },
    },
  });

  const rows = leads.map((l) => ({
    id: l.id,
    name: l.name,
    status: l.status,
    contactsCount: l.contacts.length,
    opportunitiesCount: l.opportunities.length,
    pipelineValue: l.opportunities.reduce(
      (s, o) => s + Number(o.value ?? 0),
      0,
    ),
    ownerEmail: l.owner?.email ?? null,
    updatedAt: l.updatedAt.toISOString(),
  }));

  return (
    <div className="p-6 space-y-4 fade-in">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Leads</h1>
          <p className="text-sm text-muted">{leads.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          <form>
            {activeStatus !== "ALL" && (
              <input type="hidden" name="status" value={activeStatus} />
            )}
            <input
              name="q"
              placeholder="Search companies…"
              defaultValue={q ?? ""}
              className="input w-64"
            />
          </form>
          <NewLeadButton />
        </div>
      </header>

      {/* Status filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_PILLS.map((p) => {
          const params = new URLSearchParams();
          if (q) params.set("q", q);
          if (p.key !== "ALL") params.set("status", p.key);
          const href =
            "/app/leads" + (params.size ? "?" + params.toString() : "");
          const active = activeStatus === p.key;
          return (
            <Link
              key={p.key}
              href={href}
              className={
                "pill " +
                (active ? (p.style ? p.style + " border" : "pill-active") : "")
              }
            >
              {p.label}
            </Link>
          );
        })}
      </div>

      <LeadsTable rows={rows} />
    </div>
  );
}
