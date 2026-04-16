import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import Link from "next/link";
import { Filter, Pin, Plus, Pencil, Trash2 } from "lucide-react";
import SmartViewActions from "./SmartViewActions";

export const dynamic = "force-dynamic";

export default async function SmartViewsPage() {
  const user = await requireUser();
  const views = await db.smartView.findMany({
    where: { ownerId: user.id },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
  });

  return (
    <div className="p-6 space-y-4 fade-in">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Smart Views</h1>
          <p className="text-sm text-muted">
            Saved filter views for quick access to segmented data
          </p>
        </div>
        <Link href="/app/smart-views/new" className="btn-primary">
          <Plus size={14} /> New Smart View
        </Link>
      </header>

      {views.length === 0 ? (
        <div className="card p-8 text-center text-muted">
          <Filter size={32} className="mx-auto mb-3 text-mutedSoft" />
          <p className="text-sm font-medium">No smart views yet</p>
          <p className="text-[13px] mt-1">
            Create your first smart view to filter and save custom lead segments.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {views.map((v) => {
            const filters = v.filters as any;
            const condCount = filters?.conditions?.length ?? 0;
            return (
              <div
                key={v.id}
                className="card px-4 py-3 flex items-center gap-3 group"
              >
                <div className="size-8 rounded-md bg-indigo-50 text-indigo-500 grid place-items-center flex-shrink-0">
                  <Filter size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/app/smart-views/${v.id}`}
                    className="font-semibold text-sm text-accent hover:underline"
                  >
                    {v.name}
                  </Link>
                  <div className="text-[11px] text-muted mt-0.5 flex items-center gap-2">
                    <span>{v.entity === "LEAD" ? "Leads" : "Opportunities"}</span>
                    <span>·</span>
                    <span>
                      {condCount} filter{condCount !== 1 ? "s" : ""}
                    </span>
                    {filters?.match === "any" && (
                      <>
                        <span>·</span>
                        <span>Match any</span>
                      </>
                    )}
                    {v.pinned && (
                      <>
                        <span>·</span>
                        <Pin size={10} className="text-amber-500" />
                        <span className="text-amber-600">Pinned</span>
                      </>
                    )}
                  </div>
                </div>
                <SmartViewActions viewId={v.id} pinned={v.pinned} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
