import Link from "next/link";
import { db } from "@/lib/db";
import NewLeadButton from "@/components/NewLeadButton";
import ContactsTable from "./ContactsTable";
import type { LeadStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_PILLS: { key: "ALL" | LeadStatus; label: string; style: string }[] = [
  { key: "ALL",       label: "All",       style: "" },
  { key: "POTENTIAL", label: "Potential", style: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "QUALIFIED", label: "Qualified", style: "bg-blue-50 text-blue-700 border-blue-200" },
  { key: "INTERESTED", label: "Interested", style: "bg-violet-50 text-violet-700 border-violet-200" },
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

  const rows = contacts.map((c) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email,
    phone: c.phone,
    title: c.title,
    leadId: c.lead?.id ?? null,
    leadName: c.lead?.name ?? null,
    leadStatus: c.lead?.status ?? null,
    updatedAt: c.updatedAt.toISOString(),
  }));

  return (
    <div className="p-6 space-y-4 fade-in">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Contacts</h1>
          <p className="text-sm text-muted">{contacts.length} shown</p>
        </div>
        <div className="flex items-center gap-2">
          <form>
            {activeStatus !== "ALL" && (
              <input type="hidden" name="status" value={activeStatus} />
            )}
            <input
              name="q"
              placeholder="Search name, email, company…"
              defaultValue={q ?? ""}
              className="input w-64"
            />
          </form>
          <NewLeadButton />
        </div>
      </header>

      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_PILLS.map((p) => {
          const params = new URLSearchParams();
          if (q) params.set("q", q);
          if (p.key !== "ALL") params.set("status", p.key);
          const href =
            "/app/contacts" + (params.size ? "?" + params.toString() : "");
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

      <ContactsTable rows={rows} />
    </div>
  );
}
