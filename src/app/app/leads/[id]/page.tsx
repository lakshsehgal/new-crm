import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney, initials } from "@/lib/utils";
import LeadHeader from "./LeadHeader";
import LeadActivityFeed from "./LeadActivityFeed";
import LeadAboutEditor from "./LeadAboutEditor";
import AddContactButton from "./AddContactButton";
import AddOppButton from "./AddOppButton";
import CustomFieldsEditor from "@/components/CustomFieldsEditor";
import { Mail, Phone } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await db.lead.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: { createdAt: "asc" } },
      opportunities: {
        include: { stage: true },
        orderBy: { createdAt: "desc" },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { user: true, contact: true, opportunity: true },
      },
      owner: true,
    },
  });
  if (!lead) notFound();

  const [pipelines, customFields] = await Promise.all([
    db.pipeline.findMany({
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      include: { stages: { orderBy: { order: "asc" } } },
    }),
    db.customField.findMany({ orderBy: { order: "asc" } }),
  ]);

  return (
    <div className="flex flex-col h-screen">
      <LeadHeader lead={lead as any} />

      <div className="grid grid-cols-[360px_1fr] flex-1 overflow-hidden">
        {/* Left column — details, opportunities, contacts */}
        <aside className="border-r border-border overflow-y-auto bg-white">
          {/* Details */}
          <Section title="About" defaultOpen>
            <LeadAboutEditor
              lead={{
                id: lead.id,
                url: lead.url,
                address: lead.address,
                description: lead.description,
                ownerEmail: lead.owner?.email ?? null,
              }}
            />
          </Section>

          {/* Tasks (placeholder count for now) */}
          <Section
            title={`Tasks`}
            count={
              lead.activities.filter((a) => a.type === "TASK" && !a.completedAt).length
            }
          />

          {/* Opportunities */}
          <Section
            title="Opportunities"
            count={lead.opportunities.length}
            right={<AddOppButton leadId={lead.id} pipelines={pipelines as any} />}
            defaultOpen
          >
            {lead.opportunities.length === 0 ? (
              <div className="text-[13px] text-mutedSoft px-4 py-3">
                No opportunities yet.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {lead.opportunities.map((o) => (
                  <li key={o.id} className="px-4 py-3 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={
                            "w-1 h-8 rounded-sm " +
                            (o.stage.isWon
                              ? "bg-emerald-500"
                              : o.stage.isLost
                                ? "bg-rose-500"
                                : "bg-amber-400")
                          }
                        />
                        <div>
                          <div className="font-semibold">
                            {formatMoney(o.value.toString(), o.currency)}
                          </div>
                          <div className="text-[11px] text-muted">
                            {new Date(o.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <span
                        className={
                          "badge uppercase text-[10px] " +
                          (o.stage.isWon
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : o.stage.isLost
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-amber-50 text-amber-700 border-amber-200")
                        }
                      >
                        {o.stage.name}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Custom fields */}
          <Section
            title="Custom fields"
            count={customFields.length}
            defaultOpen={customFields.length > 0}
          >
            <CustomFieldsEditor
              entityKind="lead"
              entityId={lead.id}
              fields={customFields as any}
              initialData={lead.customData as any}
            />
          </Section>

          {/* Contacts */}
          <Section
            title="Contacts"
            count={lead.contacts.length}
            right={<AddContactButton leadId={lead.id} />}
            defaultOpen
          >
            {lead.contacts.length === 0 ? (
              <div className="text-[13px] text-mutedSoft px-4 py-3">
                No contacts yet.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {lead.contacts.map((c) => {
                  const name =
                    [c.firstName, c.lastName].filter(Boolean).join(" ") ||
                    c.email ||
                    "(no name)";
                  return (
                    <li key={c.id} className="px-4 py-2.5 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="size-6 rounded-full bg-accentSoft text-accent text-[10px] font-semibold grid place-items-center">
                          {initials(name, c.email)}
                        </div>
                        <Link
                          href={`/app/contacts/${c.id}`}
                          className="font-medium flex-1 truncate hover:underline"
                        >
                          {name}
                        </Link>
                        <div className="flex items-center gap-1.5 text-muted">
                          {c.email && (
                            <a href={`mailto:${c.email}`} title={c.email}>
                              <Mail size={12} />
                            </a>
                          )}
                          {c.phone && (
                            <a href={`tel:${c.phone}`} title={c.phone}>
                              <Phone size={12} />
                            </a>
                          )}
                        </div>
                      </div>
                      {c.title && (
                        <div className="text-[11px] text-mutedSoft pl-8 mt-0.5">
                          {c.title}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        </aside>

        {/* Right column — activity feed */}
        <section className="overflow-y-auto">
          <LeadActivityFeed leadId={lead.id} activities={lead.activities as any} />
        </section>
      </div>
    </div>
  );
}

function Section({
  title,
  count,
  right,
  children,
  defaultOpen = false,
}: {
  title: string;
  count?: number;
  right?: React.ReactNode;
  children?: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="border-b border-border" open={defaultOpen}>
      <summary className="list-none px-4 py-3 flex items-center gap-2 cursor-pointer hover:bg-surface">
        <span className="text-[10px] text-muted">▸</span>
        <span className="label">{title}</span>
        {typeof count === "number" && (
          <span className="text-[11px] text-muted ml-0.5">{count}</span>
        )}
        <span className="ml-auto flex items-center gap-1">{right}</span>
      </summary>
      {children}
    </details>
  );
}

