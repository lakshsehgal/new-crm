import { db } from "@/lib/db";
import NewLeadButton from "@/components/NewLeadButton";
import ConvertLeadButton from "./ConvertLeadButton";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const [leads, pipelines] = await Promise.all([
    db.lead.findMany({
      orderBy: { updatedAt: "desc" },
      include: { contact: true, owner: true },
      take: 200,
    }),
    db.pipeline.findMany({
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      include: { stages: { orderBy: { order: "asc" } } },
    }),
  ]);

  const pipelineOpts = pipelines.map((p) => ({
    id: p.id,
    name: p.name,
    stages: p.stages.map((s) => ({ id: s.id, name: s.name })),
  }));

  return (
    <div className="p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Leads</h1>
          <p className="text-sm text-muted">{leads.length} open</p>
        </div>
        <NewLeadButton label="New lead" />
      </header>
      <div className="card overflow-hidden">
        <table className="tbl">
          <thead>
            <tr>
              <th>Company</th>
              <th>Contact</th>
              <th>Status</th>
              <th>Value</th>
              <th>Owner</th>
              <th>Updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => {
              const contactName = l.contact
                ? [l.contact.firstName, l.contact.lastName].filter(Boolean).join(" ") ||
                  l.contact.email ||
                  "—"
                : "—";
              return (
                <tr key={l.id}>
                  <td className="font-medium">{l.title}</td>
                  <td>{contactName}</td>
                  <td>
                    <span className="badge">{l.status}</span>
                  </td>
                  <td>{l.value ? formatMoney(l.value.toString()) : "—"}</td>
                  <td className="text-muted">{l.owner?.email ?? "—"}</td>
                  <td className="text-muted">
                    {new Date(l.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="text-right">
                    <ConvertLeadButton leadId={l.id} pipelines={pipelineOpts} />
                  </td>
                </tr>
              );
            })}
            {leads.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-muted py-10">
                  No leads yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
