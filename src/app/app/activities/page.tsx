import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ActivitiesPage() {
  const acts = await db.activity.findMany({
    orderBy: { createdAt: "desc" },
    include: { contact: true, opportunity: true, user: true },
    take: 200,
  });
  return (
    <div className="p-6 space-y-4">
      <header><h1 className="text-xl font-semibold">Activities</h1></header>
      <div className="card overflow-hidden">
        <table className="tbl">
          <thead>
            <tr>
              <th>Type</th>
              <th>Title</th>
              <th>Contact</th>
              <th>Opportunity</th>
              <th>Owner</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {acts.map((a) => (
              <tr key={a.id}>
                <td><span className="badge">{a.type}</span></td>
                <td className="font-medium">{a.title}</td>
                <td>{a.contact ? [a.contact.firstName, a.contact.lastName].filter(Boolean).join(" ") : "—"}</td>
                <td>{a.opportunity?.name ?? "—"}</td>
                <td className="text-muted">{a.user?.email ?? "—"}</td>
                <td className="text-muted">{new Date(a.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {acts.length === 0 && (
              <tr><td colSpan={6} className="text-center text-muted py-10">No activity yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
