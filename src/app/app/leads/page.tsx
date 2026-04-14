import Link from "next/link";
import { db } from "@/lib/db";
import NewLeadButton from "@/components/NewLeadButton";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

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
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const leads = await db.lead.findMany({
    where: q
      ? { name: { contains: q, mode: "insensitive" } }
      : {},
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: {
      contacts: { select: { id: true } },
      opportunities: {
        select: { id: true, value: true, currency: true, stage: { select: { name: true, isWon: true } } },
      },
      owner: { select: { email: true } },
    },
  });

  return (
    <div className="p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Leads</h1>
          <p className="text-sm text-muted">{leads.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          <form>
            <input
              name="q"
              placeholder="Search companies…"
              defaultValue={q ?? ""}
              className="input w-72"
            />
          </form>
          <NewLeadButton />
        </div>
      </header>

      <div className="card overflow-hidden">
        <table className="tbl">
          <thead>
            <tr>
              <th>Company</th>
              <th>Status</th>
              <th>Contacts</th>
              <th>Opportunities</th>
              <th>Pipeline value</th>
              <th>Updated</th>
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
                  <td>
                    <Link href={`/app/leads/${l.id}`} className="font-medium text-accent hover:underline">
                      {l.name}
                    </Link>
                  </td>
                  <td>
                    <span className={`badge ${statusStyles[l.status] ?? ""}`}>
                      {l.status.replace("_", " ")}
                    </span>
                  </td>
                  <td>{l.contacts.length}</td>
                  <td>{l.opportunities.length}</td>
                  <td>{total > 0 ? formatMoney(total) : "—"}</td>
                  <td className="text-muted">
                    {new Date(l.updatedAt).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
            {leads.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-muted py-10">
                  No leads yet. Click "New lead" to add your first company.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
