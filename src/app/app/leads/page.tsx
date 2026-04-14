import Link from "next/link";
import { db } from "@/lib/db";
import NewLeadButton from "@/components/NewLeadButton";
import ColumnPicker from "@/components/ColumnPicker";
import { formatMoney } from "@/lib/utils";
import type { LeadStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_PILLS: { key: "ALL" | LeadStatus; label: string; style: string }[] = [
  { key: "ALL",       label: "All",       style: "" },
  { key: "POTENTIAL", label: "Potential", style: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "QUALIFIED", label: "Qualified", style: "bg-blue-50 text-blue-700 border-blue-200" },
  { key: "CUSTOMER",  label: "Customer",  style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { key: "BAD_FIT",   label: "Bad fit",   style: "bg-rose-50 text-rose-700 border-rose-200" },
  { key: "CHURNED",   label: "Churned",   style: "bg-gray-100 text-gray-600 border-gray-200" },
];

const statusStyles: Record<string, string> = {
  POTENTIAL: "bg-amber-50 text-amber-700 border-amber-200",
  QUALIFIED: "bg-blue-50 text-blue-700 border-blue-200",
  CUSTOMER: "bg-emerald-50 text-emerald-700 border-emerald-200",
  BAD_FIT: "bg-rose-50 text-rose-700 border-rose-200",
  CHURNED: "bg-gray-100 text-gray-600 border-gray-200",
};

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
        select: { id: true, value: true, currency: true, stage: { select: { name: true } } },
      },
      owner: { select: { email: true } },
    },
  });

  const columns = [
    { key: "name",     label: "Company", locked: true },
    { key: "status",   label: "Status" },
    { key: "contacts", label: "Contacts" },
    { key: "opps",     label: "Opportunities" },
    { key: "value",    label: "Pipeline value" },
    { key: "owner",    label: "Owner" },
    { key: "updated",  label: "Updated" },
  ];

  return (
    <div className="p-6 space-y-4 fade-in">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Leads</h1>
          <p className="text-sm text-muted">{leads.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          <form>
            {activeStatus !== "ALL" && <input type="hidden" name="status" value={activeStatus} />}
            <input
              name="q"
              placeholder="Search companies…"
              defaultValue={q ?? ""}
              className="input w-64"
            />
          </form>
          <ColumnPicker storageKey="leads" columns={columns} />
          <NewLeadButton />
        </div>
      </header>

      {/* Status filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_PILLS.map((p) => {
          const params = new URLSearchParams();
          if (q) params.set("q", q);
          if (p.key !== "ALL") params.set("status", p.key);
          const href = "/app/leads" + (params.size ? "?" + params.toString() : "");
          const active = activeStatus === p.key;
          return (
            <Link
              key={p.key}
              href={href}
              className={"pill " + (active ? (p.style ? p.style + " border" : "pill-active") : "")}
            >
              {p.label}
            </Link>
          );
        })}
      </div>

      <div className="card overflow-hidden" data-col-scope="leads">
        <table className="tbl">
          <thead>
            <tr>
              <th data-col="name">Company</th>
              <th data-col="status">Status</th>
              <th data-col="contacts">Contacts</th>
              <th data-col="opps">Opps</th>
              <th data-col="value">Pipeline value</th>
              <th data-col="owner">Owner</th>
              <th data-col="updated">Updated</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => {
              const total = l.opportunities.reduce(
                (s, o) => s + Number(o.value ?? 0),
                0,
              );
              return (
                <tr key={l.id}>
                  <td data-col="name">
                    <Link href={`/app/leads/${l.id}`} className="font-medium text-accent hover:underline">
                      {l.name}
                    </Link>
                  </td>
                  <td data-col="status">
                    <span className={`badge ${statusStyles[l.status] ?? ""}`}>
                      {l.status.replace("_", " ")}
                    </span>
                  </td>
                  <td data-col="contacts">{l.contacts.length}</td>
                  <td data-col="opps">{l.opportunities.length}</td>
                  <td data-col="value">{total > 0 ? formatMoney(total) : "—"}</td>
                  <td data-col="owner" className="text-muted">{l.owner?.email ?? "—"}</td>
                  <td data-col="updated" className="text-muted">
                    {new Date(l.updatedAt).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
            {leads.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-muted py-10">
                  No leads in this filter. Click "New lead" to add your first company.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
