"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  PhoneCall,
  Phone,
  Globe,
  User as UserIcon,
  Check,
  Undo2,
  Trophy,
  ThumbsDown,
  X,
} from "lucide-react";

export type CallRow = {
  id: string;
  title: string;
  dueAt: string | null;
  completedAt: string | null;
  leadId: string;
  leadName: string;
  leadUrl: string | null;
  leadStatus: string;
  contactName: string | null;
  phone: string | null;
  ownerLabel: string | null;
  opportunityId: string | null;
};

type Pipeline = { id: string; name: string; stages: { id: string; name: string }[] };

export default function DiscoveryCallsList({
  due,
  completed,
  pipelines,
}: {
  due: CallRow[];
  completed: CallRow[];
  pipelines: Pipeline[];
}) {
  const [converting, setConverting] = useState<CallRow | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  async function setCompleted(row: CallRow, value: boolean) {
    const res = await fetch(`/api/internal/activities/${row.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ completed: value }),
    });
    if (!res.ok) return toast.error("Failed to update the ticket");
    toast.success(value ? "Call marked done" : "Ticket reopened");
    start(() => router.refresh());
  }

  /**
   * Discovery call went badly: complete the ticket and send the lead back
   * to the Leads list as unqualified (Bad fit).
   */
  async function didNotQualify(row: CallRow) {
    if (
      !confirm(
        `Drop ${row.leadName}? The ticket will be completed and the lead sent back to Leads as unqualified (Bad fit).`,
      )
    )
      return;
    const [leadRes, ticketRes] = await Promise.all([
      fetch(`/api/internal/leads/${row.leadId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "BAD_FIT" }),
      }),
      row.completedAt
        ? Promise.resolve(new Response(null, { status: 200 }))
        : fetch(`/api/internal/activities/${row.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ completed: true }),
          }),
    ]);
    if (!leadRes.ok || !ticketRes.ok) return toast.error("Failed to drop the lead");
    toast.success(`${row.leadName} dropped — back in Leads as unqualified`);
    start(() => router.refresh());
  }

  return (
    <>
      <div className="card overflow-hidden">
        {due.length === 0 ? (
          <div className="p-8 text-sm text-muted text-center">
            <PhoneCall size={18} className="mx-auto mb-2 opacity-50" />
            All caught up — no discovery calls due.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {due.map((row) => (
              <CallItem key={row.id} row={row}>
                <button
                  className="btn-ghost flex items-center gap-1"
                  onClick={() => setCompleted(row, true)}
                  disabled={pending}
                  title="Mark done without an outcome — decide later"
                >
                  <Check size={13} /> Done
                </button>
                <button
                  className="btn flex items-center gap-1.5"
                  onClick={() => didNotQualify(row)}
                  disabled={pending}
                  title="Complete the ticket and send the lead back as unqualified"
                >
                  <ThumbsDown size={13} /> Didn&apos;t qualify
                </button>
                <button
                  className="btn-primary flex items-center gap-1.5"
                  onClick={() => setConverting(row)}
                  disabled={pending}
                  title="Complete the ticket and create the opportunity"
                >
                  <Trophy size={13} /> Qualified — create opportunity
                </button>
              </CallItem>
            ))}
          </ul>
        )}
      </div>

      {completed.length > 0 && (
        <section className="space-y-2">
          <h2 className="label">Recently completed</h2>
          <div className="card overflow-hidden">
            <ul className="divide-y divide-border">
              {completed.map((row) => (
                <CallItem key={row.id} row={row} done>
                  {row.opportunityId ? (
                    <Link
                      href={`/app/opportunities/${row.opportunityId}`}
                      className="pill bg-emerald-50 text-emerald-700 border-emerald-200 border"
                    >
                      <Trophy size={12} /> View opportunity
                    </Link>
                  ) : row.leadStatus === "BAD_FIT" ? (
                    <span className="pill bg-rose-50 text-rose-700 border-rose-200 border">
                      <ThumbsDown size={12} /> Didn&apos;t qualify
                    </span>
                  ) : (
                    <>
                      <button
                        className="btn flex items-center gap-1.5"
                        onClick={() => didNotQualify(row)}
                        disabled={pending}
                      >
                        <ThumbsDown size={13} /> Didn&apos;t qualify
                      </button>
                      <button
                        className="btn-primary flex items-center gap-1.5"
                        onClick={() => setConverting(row)}
                        disabled={pending}
                      >
                        <Trophy size={13} /> Convert to opportunity
                      </button>
                    </>
                  )}
                  <button
                    className="btn-ghost flex items-center gap-1"
                    onClick={() => setCompleted(row, false)}
                    disabled={pending}
                    title="Reopen this ticket"
                  >
                    <Undo2 size={13} /> Undo
                  </button>
                </CallItem>
              ))}
            </ul>
          </div>
        </section>
      )}

      {converting && (
        <ConvertModal
          row={converting}
          pipelines={pipelines}
          onClose={() => setConverting(null)}
        />
      )}
    </>
  );
}

function CallItem({
  row,
  done,
  children,
}: {
  row: CallRow;
  done?: boolean;
  children: React.ReactNode;
}) {
  const overdue =
    !done && row.dueAt !== null && new Date(row.dueAt).getTime() < Date.now();

  return (
    <li className="p-4 flex items-center gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/app/leads/${row.leadId}`}
            className="font-medium hover:underline truncate"
          >
            {row.leadName}
          </Link>
          {done ? (
            <span className="badge">
              Completed{" "}
              {row.completedAt && new Date(row.completedAt).toLocaleDateString()}
            </span>
          ) : row.dueAt ? (
            <span
              className={
                "badge " +
                (overdue ? "bg-rose-50 text-rose-700 border-rose-200" : "")
              }
            >
              {overdue ? "Overdue — " : "Due "}
              {new Date(row.dueAt).toLocaleString([], {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          ) : null}
        </div>
        <div className="mt-1.5 flex items-center gap-4 flex-wrap text-[13px] text-muted">
          {row.phone ? (
            <a
              href={`tel:${row.phone}`}
              className="flex items-center gap-1.5 text-accent hover:underline"
            >
              <Phone size={13} /> {row.phone}
            </a>
          ) : (
            <span className="flex items-center gap-1.5 opacity-60">
              <Phone size={13} /> No phone on file
            </span>
          )}
          {row.contactName && (
            <span className="flex items-center gap-1.5">
              <UserIcon size={13} /> {row.contactName}
            </span>
          )}
          {row.leadUrl && (
            <a
              href={row.leadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:underline truncate max-w-[240px]"
            >
              <Globe size={13} />
              {row.leadUrl.replace(/^https?:\/\/(www\.)?/i, "")}
            </a>
          )}
          {row.ownerLabel && <span>Assigned to {row.ownerLabel}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">{children}</div>
    </li>
  );
}

/**
 * Pre-select the "Meeting booked" / "Call booked" stage when the pipeline
 * has one — the sales flow is: discovery call done → G-Meet scheduled →
 * opportunity starts at Meeting booked.
 */
function defaultStageId(pipeline: Pipeline | undefined): string {
  if (!pipeline) return "";
  const meeting = pipeline.stages.find((s) => /meeting|booked/i.test(s.name));
  return (meeting ?? pipeline.stages[0])?.id ?? "";
}

/** Mirrors AddOppButton's modal, seeded from the discovery call's lead. */
function ConvertModal({
  row,
  pipelines,
  onClose,
}: {
  row: CallRow;
  pipelines: Pipeline[];
  onClose: () => void;
}) {
  const [name, setName] = useState(row.leadName);
  const [value, setValue] = useState("");
  const [pipelineId, setPipelineId] = useState(pipelines[0]?.id ?? "");
  const [stageId, setStageId] = useState(defaultStageId(pipelines[0]));
  const [pending, start] = useTransition();
  const router = useRouter();

  const activePipeline = pipelines.find((p) => p.id === pipelineId);

  async function convert() {
    if (!name.trim()) return toast.error("Name is required");
    const res = await fetch(`/api/internal/leads/${row.leadId}/opportunities`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        value: value ? Number(value) : undefined,
        pipelineId,
        stageId,
      }),
    });
    if (!res.ok) return toast.error("Failed to create the opportunity");
    // Converting also closes the ticket if it's still open
    if (!row.completedAt) {
      await fetch(`/api/internal/activities/${row.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
    }
    toast.success("Opportunity created");
    onClose();
    start(() => router.refresh());
  }

  if (pipelines.length === 0) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
          <p className="text-sm text-muted">
            No pipelines yet. Create one in Admin → Pipelines first.
          </p>
          <div className="flex justify-end mt-4">
            <button className="btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Convert to opportunity</h2>
          <button
            className="size-7 grid place-items-center text-muted hover:bg-surface rounded"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>
        <p className="text-[13px] text-muted mt-1">
          Discovery call with {row.leadName} went well — create the opportunity.
        </p>
        <div className="space-y-3 mt-4">
          <label className="block"><span className="label">Name</span>
            <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </label>
          <label className="block"><span className="label">Value</span>
            <input type="number" step="0.01" className="input mt-1" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" />
          </label>
          <label className="block"><span className="label">Pipeline</span>
            <select className="input mt-1" value={pipelineId} onChange={(e) => {
              setPipelineId(e.target.value);
              setStageId(defaultStageId(pipelines.find((pp) => pp.id === e.target.value)));
            }}>
              {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className="block"><span className="label">Starting stage</span>
            <select className="input mt-1" value={stageId} onChange={(e) => setStageId(e.target.value)}>
              {activePipeline?.stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={convert} disabled={pending}>
            {pending ? "Converting…" : "Create opportunity"}
          </button>
        </div>
      </div>
    </div>
  );
}
