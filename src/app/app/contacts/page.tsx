import Link from "next/link";
import { db } from "@/lib/db";
import { initials } from "@/lib/utils";
import NewLeadButton from "@/components/NewLeadButton";

export const dynamic = "force-dynamic";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const where = q
    ? {
        OR: [
          { firstName: { contains: q, mode: "insensitive" as const } },
          { lastName: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
          { company: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};
  const contacts = await db.contact.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: {
      leads: { select: { id: true, status: true } },
      opportunities: { select: { id: true, name: true, stage: { select: { name: true } } } },
    },
  });

  return (
    <div className="p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Contacts</h1>
          <p className="text-sm text-muted">{contacts.length} shown</p>
        </div>
        <div className="flex items-center gap-2">
          <form>
            <input
              name="q"
              placeholder="Search name, email, company…"
              defaultValue={q ?? ""}
              className="input w-72"
            />
          </form>
          <NewLeadButton label="New lead" />
        </div>
      </header>

      <div className="card overflow-hidden">
        <table className="tbl">
          <thead>
            <tr>
              <th>Name</th>
              <th>Company</th>
              <th>Email</th>
              <th>Attached to</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => {
              const name =
                [c.firstName, c.lastName].filter(Boolean).join(" ") || "(no name)";
              const opp = c.opportunities[0];
              const lead = c.leads[0];
              return (
                <tr key={c.id}>
                  <td>
                    <Link className="flex items-center gap-2" href={`/app/contacts/${c.id}`}>
                      <span className="size-6 rounded-full bg-accentSoft text-accent text-[10px] font-medium grid place-items-center">
                        {initials(name, c.email)}
                      </span>
                      <span className="font-medium">{name}</span>
                    </Link>
                  </td>
                  <td>{c.company ?? "—"}</td>
                  <td className="text-muted">{c.email ?? "—"}</td>
                  <td>
                    {opp ? (
                      <span className="badge bg-accentSoft text-accent border-accent/20">
                        Opportunity · {opp.stage.name}
                      </span>
                    ) : lead ? (
                      <span className="badge bg-amber-50 text-amber-700 border-amber-200">
                        Lead · {lead.status}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="text-muted">
                    {new Date(c.updatedAt).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
            {contacts.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-muted py-10">
                  No contacts yet. Click "New lead" to create the first one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
