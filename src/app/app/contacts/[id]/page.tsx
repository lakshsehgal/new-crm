import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { initials } from "@/lib/utils";
import ContactEditor from "./ContactEditor";
import ActivityList from "./ActivityList";
import EmailThread from "./EmailThread";
import { Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contact = await db.contact.findUnique({
    where: { id },
    include: {
      owner: true,
      lead: {
        include: {
          opportunities: { include: { stage: true }, orderBy: { createdAt: "desc" } },
        },
      },
      activities: { orderBy: { createdAt: "desc" }, take: 50 },
      emails: { orderBy: { sentAt: "desc" }, take: 50 },
    },
  });
  if (!contact) notFound();

  const customFields = await db.customField.findMany({
    orderBy: { order: "asc" },
  });

  const name =
    [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "(no name)";

  return (
    <div className="p-6 grid grid-cols-3 gap-5">
      <div className="col-span-2 space-y-5">
        <div className="card p-5 flex items-start gap-4">
          <div className="size-12 rounded-full bg-accentSoft text-accent grid place-items-center font-semibold">
            {initials(name, contact.email)}
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">{name}</h1>
            <p className="text-sm text-muted flex items-center gap-2 mt-1">
              {contact.title ? `${contact.title} · ` : ""}
              {contact.lead ? (
                <>
                  <Building2 size={14} />
                  <Link href={`/app/leads/${contact.lead.id}`} className="text-accent hover:underline">
                    {contact.lead.name}
                  </Link>
                </>
              ) : (
                "—"
              )}
            </p>
          </div>
        </div>

        <ContactEditor contact={contact as any} customFields={customFields as any} />

        <section className="card">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="font-medium">Emails</h2>
            <span className="text-xs text-muted">{contact.emails.length}</span>
          </div>
          <EmailThread contactId={contact.id} emails={contact.emails as any} />
        </section>

        <section className="card">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="font-medium">Activity</h2>
          </div>
          <ActivityList contactId={contact.id} activities={contact.activities as any} />
        </section>
      </div>

      <aside className="space-y-4">
        <section className="card p-4">
          <div className="label">Details</div>
          <dl className="mt-2 space-y-2 text-sm">
            <div className="flex gap-2"><dt className="w-20 text-muted">Email</dt><dd className="flex-1 break-all">{contact.email ?? "—"}</dd></div>
            <div className="flex gap-2"><dt className="w-20 text-muted">Phone</dt><dd>{contact.phone ?? "—"}</dd></div>
            <div className="flex gap-2"><dt className="w-20 text-muted">Owner</dt><dd className="flex-1 break-all">{contact.owner?.email ?? "—"}</dd></div>
            <div className="flex gap-2"><dt className="w-20 text-muted">Created</dt><dd>{new Date(contact.createdAt).toLocaleDateString()}</dd></div>
          </dl>
        </section>

        {contact.lead && (
          <section className="card p-4">
            <div className="label">Opportunities at this lead</div>
            {contact.lead.opportunities.length === 0 && (
              <div className="text-sm text-muted mt-2">None</div>
            )}
            <ul className="mt-2 space-y-1 text-sm">
              {contact.lead.opportunities.map((o) => (
                <li key={o.id} className="flex items-center justify-between">
                  <span>{o.name}</span>
                  <span className="badge">{o.stage.name}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>
    </div>
  );
}
