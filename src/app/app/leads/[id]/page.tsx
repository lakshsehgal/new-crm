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
import {
  Mail,
  Phone,
  Info,
  CheckCircle2,
  Trophy,
  IdCard,
  ListChecks,
  ChevronRight,
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

  const openTaskCount = lead.activities.filter(
    (a) => a.type === "TASK" && !a.completedAt,
  ).length;

  return (
    <div className="flex flex-col h-screen">
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
              right={<IconBtn title="Add task"><Plus size={12} /></IconBtn>}
            />

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
                      <li key={c.id} className="px-4 py-2.5 text-sm">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/app/contacts/${c.id}`}
                            className="font-semibold flex-1 truncate hover:underline text-ink"
                          >
                            {name}
                          </Link>
                          <div className="flex items-center gap-2 text-muted">
                            {c.email && (
                              <a href={`mailto:${c.email}`} title={c.email} className="hover:text-ink">
                                <Mail size={13} />
                              </a>
                            )}
                            {c.phone && (
                              <a href={`tel:${c.phone}`} title={c.phone} className="hover:text-ink">
                                <Phone size={13} />
                              </a>
                            )}
                          </div>
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
          <LeadActivityFeed leadId={lead.id} activities={lead.activities as any} />
        </section>
      </div>
    </div>
  );
}

function Section({
  icon,
  iconBg,
  title,
  count,
  right,
  children,
  defaultOpen = false,
}: {
  icon?: React.ReactNode;
  iconBg?: string;
  title: string;
  count?: number;
  right?: React.ReactNode;
  children?: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="section" open={defaultOpen}>
      <summary>
        <span className="chev">
          <ChevronRight size={14} />
        </span>
        {icon && (
          <span className={"sec-ico " + (iconBg ?? "bg-surface")}>{icon}</span>
        )}
        <span className="sec-title">{title}</span>
        {typeof count === "number" && <span className="sec-count">{count}</span>}
        <span className="ml-auto flex items-center gap-1">{right}</span>
      </summary>
      {children && <div className="bg-white">{children}</div>}
    </details>
  );
}

function IconBtn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="size-5 grid place-items-center rounded text-muted hover:bg-surface hover:text-ink"
      title={title}
      onClick={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}
