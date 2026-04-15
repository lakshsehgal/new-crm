import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { formatMoney } from "@/lib/utils";
import LeadHeader from "./LeadHeader";
import LeadActivityFeed from "./LeadActivityFeed";
import LeadAboutEditor from "./LeadAboutEditor";
import AddContactButton from "./AddContactButton";
import AddOppButton from "./AddOppButton";
import CustomFieldsEditor from "@/components/CustomFieldsEditor";
import TasksSection from "@/components/TasksSection";
import ContactInlineEdit from "@/components/ContactInlineEdit";
import Section, { SectionIconBtn as IconBtn } from "@/components/Section";
import {
  Info,
  CheckCircle2,
  Trophy,
  IdCard,
  ListChecks,
  Plus,
  Search,
  MoreHorizontal,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const myName = (session?.user as any)?.name ?? session?.user?.email ?? null;

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

  const contactIds = lead.contacts.map((c) => c.id);
  const contactEmails = lead.contacts
    .map((c) => c.email)
    .filter((e): e is string => !!e);
  const [pipelines, customFields, emails] = await Promise.all([
    db.pipeline.findMany({
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      include: { stages: { orderBy: { order: "asc" } } },
    }),
    db.customField.findMany({ orderBy: { order: "asc" } }),
    contactIds.length || contactEmails.length
      ? db.email.findMany({
          where: {
            OR: [
              ...(contactIds.length ? [{ contactId: { in: contactIds } }] : []),
              ...(contactEmails.length
                ? [
                    { fromEmail: { in: contactEmails } },
                    { toEmails: { hasSome: contactEmails } },
                  ]
                : []),
            ],
          },
          orderBy: { sentAt: "desc" },
          take: 50,
        })
      : Promise.resolve([] as any[]),
  ]);

  const openTaskCount = lead.activities.filter(
    (a) => a.type === "TASK" && !a.completedAt,
  ).length;

  return (
    <div className="flex flex-col h-full">
      <LeadHeader lead={lead as any} />

      <div className="grid grid-cols-[380px_1fr] flex-1 overflow-hidden">
        {/* Left column — details */}
        <aside className="border-r border-border overflow-y-auto bg-surface">
          <div className="px-3 pt-3 pb-1 flex items-center gap-4 border-b border-border bg-white">
            <div className="py-1 text-[13px] font-semibold border-b-2 border-ink">Details</div>
            <div className="py-1 text-[13px] text-muted">Files</div>
          </div>

          <div className="p-3 space-y-2">
            {/* About */}
            <Section
              icon={<Info size={13} className="text-accent" />}
              iconBg="bg-accentSoft"
              title="About"
              defaultOpen
            >
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

            {/* Tasks */}
            <Section
              icon={<CheckCircle2 size={13} className="text-rose-500" />}
              iconBg="bg-rose-50"
              title="Tasks"
              count={openTaskCount}
              defaultOpen
            >
              <TasksSection
                leadId={lead.id}
                initialTasks={lead.activities
                  .filter((a) => a.type === "TASK")
                  .map((a) => ({
                    id: a.id,
                    title: a.title,
                    body: a.body,
                    dueAt: a.dueAt?.toISOString() ?? null,
                    completedAt: a.completedAt?.toISOString() ?? null,
                  }))}
              />
            </Section>

            {/* Opportunities */}
            <Section
              icon={<Trophy size={13} className="text-amber-500" />}
              iconBg="bg-amber-50"
              title="Opportunities"
              count={lead.opportunities.length}
              right={
                <div className="flex items-center gap-1">
                  <IconBtn title="Search"><Search size={12} /></IconBtn>
                  <AddOppButton leadId={lead.id} pipelines={pipelines as any} />
                </div>
              }
              defaultOpen={lead.opportunities.length > 0}
            >
              {lead.opportunities.length === 0 ? (
                <div className="text-[13px] text-mutedSoft px-4 py-3">
                  No opportunities yet.
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {lead.opportunities.map((o) => (
                    <li key={o.id}>
                      <Link
                        href={`/app/opportunities/${o.id}`}
                        className="flex items-center justify-between px-4 py-3 text-sm hover:bg-surface/60 transition-colors"
                      >
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
                              {formatMoney(o.value.toString())}
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
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {/* Contacts */}
            <Section
              icon={<IdCard size={13} className="text-indigo-500" />}
              iconBg="bg-indigo-50"
              title="Contacts"
              count={lead.contacts.length}
              right={
                <div className="flex items-center gap-1">
                  <IconBtn title="Search"><Search size={12} /></IconBtn>
                  <AddContactButton leadId={lead.id} />
                </div>
              }
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
                      <li key={c.id} className="px-4 py-2.5 text-sm group">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/app/contacts/${c.id}`}
                            className="font-semibold flex-1 truncate hover:underline text-ink"
                          >
                            {name}
                          </Link>
                          <ContactInlineEdit
                            contact={{ id: c.id, email: c.email, phone: c.phone }}
                          />
                        </div>
                        {c.title && (
                          <div className="text-[11px] text-mutedSoft mt-0.5">
                            {c.title}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>

            {/* Custom fields */}
            <Section
              icon={<ListChecks size={13} className="text-emerald-600" />}
              iconBg="bg-emerald-50"
              title="Custom fields"
              count={customFields.length}
              right={
                <div className="flex items-center gap-1">
                  <IconBtn title="More"><MoreHorizontal size={12} /></IconBtn>
                  <IconBtn title="Search"><Search size={12} /></IconBtn>
                  <Link href="/app/admin/custom-fields" className="size-5 grid place-items-center rounded text-muted hover:bg-surface hover:text-ink" title="Add field">
                    <Plus size={12} />
                  </Link>
                </div>
              }
              defaultOpen={customFields.length > 0}
            >
              <CustomFieldsEditor
                entityKind="lead"
                entityId={lead.id}
                fields={customFields as any}
                initialData={lead.customData as any}
              />
            </Section>
          </div>
        </aside>

        {/* Right column — activity feed */}
        <section className="overflow-y-auto">
          <LeadActivityFeed
            leadId={lead.id}
            leadName={lead.name}
            activities={lead.activities as any}
            emails={emails.map((e: any) => ({
              id: e.id,
              subject: e.subject,
              snippet: e.snippet,
              fromEmail: e.fromEmail,
              fromName: e.fromName,
              direction: e.direction,
              sentAt: e.sentAt.toISOString(),
            }))}
            contacts={lead.contacts.map((c) => ({
              id: c.id,
              firstName: c.firstName,
              lastName: c.lastName,
              email: c.email,
            }))}
            myName={myName}
          />
        </section>
      </div>
    </div>
  );
}

