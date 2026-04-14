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
  const contacts = await db.contact.findMany({
    where: q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" as const } },
            { lastName: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { lead: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {},
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: { lead: true },
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
          <NewLeadButton />
        </div>
      </header>

      <div className="card overflow-hidden">
        <table className="tbl">
          <thead>
            <tr>
              <th>Name</th>
              <th>Company</th>
              <th>Title</th>
              <th>Email</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => {
              const name =
                [c.firstName, c.lastName].filter(Boolean).join(" ") || "(no name)";
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
                  <td>
                    {c.lead ? (
                      <Link href={`/app/leads/${c.lead.id}`} className="text-accent hover:underline">
                        {c.lead.name}
                      </Link>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>{c.title ?? "—"}</td>
                  <td className="text-muted">{c.email ?? "—"}</td>
                  <td className="text-muted">
                    {new Date(c.updatedAt).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
            {contacts.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-muted py-10">
                  No contacts yet. Click "New lead" to create your first company + contact.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
