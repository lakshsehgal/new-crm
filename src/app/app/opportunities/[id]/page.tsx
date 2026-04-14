import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/utils";
import OpportunityEditor from "./OpportunityEditor";
import CustomFieldsEditor from "@/components/CustomFieldsEditor";
import { ArrowLeft, Building2, Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const opp = await db.opportunity.findUnique({
    where: { id },
    include: {
      lead: {
        include: {
          contacts: { orderBy: { createdAt: "asc" }, take: 5 },
        },
      },
      stage: true,
      pipeline: { include: { stages: { orderBy: { order: "asc" } } } },
      owner: true,
      activities: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { user: true },
      },
    },
  });
  if (!opp) notFound();

  const customFields = await db.customField.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="flex flex-col h-screen bg-surface">
      {/* Header */}
      <div className="h-14 border-b border-border px-5 flex items-center gap-3 bg-white flex-shrink-0">
        <Link
          href={`/app/leads/${opp.leadId}`}
          className="size-7 grid place-items-center rounded-md text-muted hover:bg-surface hover:text-ink"
          title="Back to lead"
        >
          <ArrowLeft size={16} />
        </Link>
        <Trophy size={16} className="text-amber-500" />
        <div className="flex items-center gap-2 min-w-0">
          <Link href={`/app/leads/${opp.leadId}`} className="text-muted text-[13px] hover:underline flex items-center gap-1">
            <Building2 size={12} /> {opp.lead.name}
          </Link>
          <span className="text-muted">/</span>
          <span className="font-semibold truncate">{opp.name}</span>
        </div>
        <div className="ml-auto text-[20px] font-semibold">
          {formatMoney(opp.value.toString())}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <OpportunityEditor
            opp={{
              id: opp.id,
              name: opp.name,
              value: opp.value.toString(),
              currency: "INR",
              stageId: opp.stageId,
              expectedCloseAt: opp.expectedCloseAt?.toISOString() ?? null,
            }}
            stages={opp.pipeline.stages.map((s) => ({ id: s.id, name: s.name, isWon: s.isWon, isLost: s.isLost }))}
          />

          {/* Lead summary */}
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Company</h2>
              <Link href={`/app/leads/${opp.leadId}`} className="btn-ghost">
                Open lead →
              </Link>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-y-2 gap-x-6 text-sm">
              <InfoRow label="Name" value={opp.lead.name} />
              <InfoRow label="Status" value={opp.lead.status.replace("_", " ")} />
              <InfoRow label="Website" value={opp.lead.url} isLink />
              <InfoRow label="Address" value={opp.lead.address} />
              <InfoRow label="Description" value={opp.lead.description} span2 />
            </dl>
          </div>

          {/* Contacts snapshot */}
          <div className="card p-5">
            <h2 className="font-semibold">Contacts on this lead</h2>
            {opp.lead.contacts.length === 0 ? (
              <div className="text-sm text-muted mt-2">No contacts yet.</div>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {opp.lead.contacts.map((c) => {
                  const name =
                    [c.firstName, c.lastName].filter(Boolean).join(" ") ||
                    c.email ||
                    "(no name)";
                  return (
                    <li key={c.id} className="py-2 flex items-center justify-between text-sm">
                      <Link href={`/app/contacts/${c.id}`} className="font-medium hover:underline">
                        {name}
                      </Link>
                      <span className="text-muted">{c.title ?? c.email ?? ""}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Custom fields */}
          {customFields.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-border font-semibold">Custom fields</div>
              <CustomFieldsEditor
                entityKind="opportunity"
                entityId={opp.id}
                fields={customFields as any}
                initialData={opp.customData as any}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  isLink,
  span2,
}: {
  label: string;
  value: string | null | undefined;
  isLink?: boolean;
  span2?: boolean;
}) {
  return (
    <div className={span2 ? "col-span-2" : undefined}>
      <dt className="text-[11px] uppercase tracking-wide text-mutedSoft">{label}</dt>
      <dd className="mt-0.5">
        {value ? (
          isLink ? (
            <a href={value} target="_blank" rel="noopener" className="text-accent hover:underline break-all">
              {value}
            </a>
          ) : (
            <span className="break-words">{value}</span>
          )
        ) : (
          <span className="text-muted">—</span>
        )}
      </dd>
    </div>
  );
}
