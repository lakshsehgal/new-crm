import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import OpportunityHeader from "./OpportunityHeader";
import OpportunityAboutEditor from "./OpportunityAboutEditor";
import OppActivityFeed from "./OppActivityFeed";
import CustomFieldsEditor from "@/components/CustomFieldsEditor";
import TasksSection from "@/components/TasksSection";
import ContactInlineEdit from "@/components/ContactInlineEdit";
import Section, { SectionIconBtn as IconBtn } from "@/components/Section";
import {
  Info,
  CheckCircle2,
  Building2,
  IdCard,
  ListChecks,
  Plus,
  Search,
  MoreHorizontal,
  ExternalLink,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const myName = (session?.user as any)?.name ?? session?.user?.email ?? null;

  const opp = await db.opportunity.findUnique({
    where: { id },
    include: {
      lead: {
        include: {
          contacts: { orderBy: { createdAt: "asc" } },
        },
      },
      stage: true,
      pipeline: { include: { stages: { orderBy: { order: "asc" } } } },
      owner: true,
      activities: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { user: true, contact: true },
      },
    },
  });
  if (!opp) notFound();

  const contactIds = opp.lead.contacts.map((c) => c.id);
  const contactEmails = opp.lead.contacts
    .map((c) => c.email)
    .filter((e): e is string => !!e);
  const [customFields, emails] = await Promise.all([
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

  const openTaskCount = opp.activities.filter(
    (a) => a.type === "TASK" && !a.completedAt,
  ).length;

  const stages = opp.pipeline.stages.map((s) => ({
    id: s.id,
    name: s.name,
    isWon: s.isWon,
    isLost: s.isLost,
  }));

  return (
    <div className="flex flex-col h-full">
      <OpportunityHeader
        oppId={opp.id}
        oppName={opp.name}
        leadId={opp.leadId}
        leadName={opp.lead.name}
        value={opp.value.toString()}
        stageId={opp.stageId}
        stages={stages}
      />

      <div className="grid grid-cols-[380px_1fr] flex-1 overflow-hidden">
        {/* Left column */}
        <aside className="border-r border-border overflow-y-auto bg-surface">
          <div className="px-3 pt-3 pb-1 flex items-center gap-4 border-b border-border bg-white">
            <div className="py-1 text-[13px] font-semibold border-b-2 border-ink">
              Details
            </div>
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
              <OpportunityAboutEditor
                opp={{
                  id: opp.id,
                  name: opp.name,
                  value: opp.value.toString(),
                  stageId: opp.stageId,
                  expectedCloseAt: opp.expectedCloseAt?.toISOString() ?? null,
                  ownerEmail: opp.owner?.email ?? null,
                  finalQuote: opp.finalQuote ?? null,
                  sow: opp.sow ?? [],
                }}
                stages={stages}
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
                opportunityId={opp.id}
                leadId={opp.leadId}
                initialTasks={opp.activities
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

            {/* Company / parent lead */}
            <Section
              icon={<Building2 size={13} className="text-indigo-500" />}
              iconBg="bg-indigo-50"
              title="Company"
              right={
                <Link
                  href={`/app/leads/${opp.leadId}`}
                  className="size-5 grid place-items-center rounded text-muted hover:bg-surface hover:text-ink"
                  title="Open lead"
                >
                  <ExternalLink size={12} />
                </Link>
              }
              defaultOpen
            >
              <div className="px-3 py-2">
                <Link
                  href={`/app/leads/${opp.leadId}`}
                  className="font-semibold text-[13px] text-accent hover:underline"
                >
                  {opp.lead.name}
                </Link>
                <div className="text-[11px] text-muted mt-0.5">
                  {opp.lead.status.replace("_", " ")}
                </div>
                {opp.lead.url && (
                  <div className="text-[12px] text-muted mt-1 truncate">
                    {opp.lead.url}
                  </div>
                )}
              </div>
            </Section>

            {/* Contacts (from lead) */}
            <Section
              icon={<IdCard size={13} className="text-indigo-500" />}
              iconBg="bg-indigo-50"
              title="Contacts"
              count={opp.lead.contacts.length}
              right={
                <div className="flex items-center gap-1">
                  <IconBtn title="Search"><Search size={12} /></IconBtn>
                </div>
              }
              defaultOpen
            >
              {opp.lead.contacts.length === 0 ? (
                <div className="text-[13px] text-mutedSoft px-4 py-3">
                  No contacts on this lead yet.
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {opp.lead.contacts.map((c) => {
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
                          <div className="text-[11px] text-mutedSoft mt-0.5">{c.title}</div>
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
                  <Link
                    href="/app/admin/custom-fields"
                    className="size-5 grid place-items-center rounded text-muted hover:bg-surface hover:text-ink"
                    title="Add field"
                  >
                    <Plus size={12} />
                  </Link>
                </div>
              }
              defaultOpen={customFields.length > 0}
            >
              <CustomFieldsEditor
                entityKind="opportunity"
                entityId={opp.id}
                fields={customFields as any}
                initialData={opp.customData as any}
              />
            </Section>
          </div>
        </aside>

        {/* Right column — activity feed */}
        <section className="overflow-y-auto">
          <OppActivityFeed
            opportunityId={opp.id}
            leadId={opp.leadId}
            leadName={opp.lead.name}
            activities={opp.activities.map((a) => ({
              id: a.id,
              type: a.type,
              title: a.title,
              body: a.body,
              createdAt: a.createdAt.toISOString(),
            }))}
            emails={emails.map((e: any) => ({
              id: e.id,
              subject: e.subject,
              snippet: e.snippet,
              fromEmail: e.fromEmail,
              fromName: e.fromName,
              direction: e.direction,
              sentAt: e.sentAt.toISOString(),
            }))}
            contacts={opp.lead.contacts.map((c) => ({
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
