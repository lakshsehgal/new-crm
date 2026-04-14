import { db } from "@/lib/db";
import NewLeadButton from "./NewLeadButton";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const leads = await db.lead.findMany({
    orderBy: { updatedAt: "desc" },
    include: { contact: true, owner: true },
    take: 200,
  });

  return (
    <div className="p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Leads</h1>
          <p className="text-sm text-muted">{leads.length} total</p>
        </div>
        <NewLeadButton />
      </header>
      <div className="card overflow-hidden">
        <table className="tbl">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Contact</th>
              <th>Value</th>
              <th>Source</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id}>
                <td className="font-medium">{l.title}</td>
                <td><span className="badge">{l.status}</span></td>
                <td>{l.contact ? [l.contact.firstName, l.contact.lastName].filter(Boolean).join(" ") : "—"}</td>
                <td>{l.value ? formatMoney(l.value.toString()) : "—"}</td>
                <td>{l.source ?? "—"}</td>
                <td className="text-muted">{new Date(l.updatedAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr><td colSpan={6} className="text-center text-muted py-10">No leads yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
