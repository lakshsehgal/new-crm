import Link from "next/link";
import { db } from "@/lib/db";
import { initials } from "@/lib/utils";
import NewLeadButton from "@/components/NewLeadButton";
import ColumnPicker from "@/components/ColumnPicker";
import type { LeadStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_PILLS: { key: "ALL" | LeadStatus; label: string; style: string }[] = [
  { key: "ALL",       label: "All",       style: "" },
  { key: "POTENTIAL", label: "Potential", style: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "QUALIFIED", label: "Qualified", style: "bg-blue-50 text-blue-700 border-blue-200" },
  { key: "CUSTOMER",  label: "Customer",  style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
];

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const activeStatus = (status as LeadStatus | "ALL" | undefined) ?? "ALL";

  const contacts = await db.contact.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" as const } },
              { lastName: { contains: q, mode: "insensitive" as const } },
              { email: { contains: q, mode: "insensitive" as const } },
              { lead: { name: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
      ...(activeStatus !== "ALL"
        ? { lead: { status: activeStatus as LeadStatus } }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: { lead: true },
  });

  const columns = [
    { key: "name",    label: "Name", locked: true },
    { key: "company", label: "Company" },
    { key: "title",   label: "Title" },
    { key: "email",   label: "Email" },
    { key: "phone",   label: "Phone" },
    { key: "status",  label: "Lead status" },
    { key: "updated", label: "Updated" },
  ];

  return (
    <div className="p-6 space-y-4 fade-in">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Contacts</h1>
          <p className="text-sm text-muted">{contacts.length} shown</p>
        </div>
        <div className="flex items-center gap-2">
          <form>
            {activeStatus !== "ALL" && <input type="hidden" name="status" value={activeStatus} />}
            <input
              name="q"
              placeholder="Search name, email, company…"
              defaultValue={q ?? ""}
              className="input w-64"
            />
          </form>
          <ColumnPicker storageKey="contacts" columns={columns} />
          <NewLeadButton />
        </div>
      </header>

      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_PILLS.map((p) => {
          const params = new URLSearchParams();
          if (q) params.set("q", q);
          if (p.key !== "ALL") params.set("status", p.key);
          const href = "/app/contacts" + (params.size ? "?" + params.toString() : "");
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

      <div className="card overflow-hidden" data-col-scope="contacts">
        <table className="tbl">
          <thead>
            <tr>
              <th data-col="name">Name</th>
              <th data-col="company">Company</th>
              <th data-col="title">Title</th>
              <th data-col="email">Email</th>
              <th data-col="phone">Phone</th>
              <th data-col="status">Lead status</th>
              <th data-col="updated">Updated</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => {
              const name =
                [c.firstName, c.lastName].filter(Boolean).join(" ") || "(no name)";
              return (
                <tr key={c.id}>
                  <td data-col="name">
                    <Link className="flex items-center gap-2" href={`/app/contacts/${c.id}`}>
                      <span className="size-6 rounded-full bg-accentSoft text-accent text-[10px] font-medium grid place-items-center">
                        {initials(name, c.email)}
                      </span>
                      <span className="font-medium">{name}</span>
                    </Link>
                  </td>
                  <td data-col="company">
                    {c.lead ? (
                      <Link href={`/app/leads/${c.lead.id}`} className="text-accent hover:underline">
                        {c.lead.name}
                      </Link>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td data-col="title">{c.title ?? "—"}</td>
                  <td data-col="email" className="text-muted">{c.email ?? "—"}</td>
                  <td data-col="phone" className="text-muted">{c.phone ?? "—"}</td>
                  <td data-col="status">
                    {c.lead ? (
                      <span className="badge">{c.lead.status.replace("_", " ")}</span>
                    ) : "—"}
                  </td>
                  <td data-col="updated" className="text-muted">
                    {new Date(c.updatedAt).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
            {contacts.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-muted py-10">
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
