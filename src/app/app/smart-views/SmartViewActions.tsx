"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pin, PinOff, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

export default function SmartViewActions({
  viewId,
  pinned,
}: {
  viewId: string;
  pinned: boolean;
}) {
  const router = useRouter();

  async function togglePin() {
    const res = await fetch(`/api/internal/smart-views/${viewId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pinned: !pinned }),
    });
    if (!res.ok) toast.error("Failed");
    else {
      toast.success(pinned ? "Unpinned" : "Pinned to sidebar");
      router.refresh();
    }
  }

  async function remove() {
    if (!confirm("Delete this smart view?")) return;
    const res = await fetch(`/api/internal/smart-views/${viewId}`, {
      method: "DELETE",
    });
    if (!res.ok) toast.error("Failed");
    else {
      toast.success("Deleted");
      router.refresh();
    }
  }

  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        onClick={togglePin}
        className="size-7 grid place-items-center rounded text-muted hover:bg-surface hover:text-ink"
        title={pinned ? "Unpin from sidebar" : "Pin to sidebar"}
      >
        {pinned ? <PinOff size={13} /> : <Pin size={13} />}
      </button>
      <Link
        href={`/app/smart-views/${viewId}`}
        className="size-7 grid place-items-center rounded text-muted hover:bg-surface hover:text-ink"
        title="Edit"
      >
        <Pencil size={13} />
      </Link>
      <button
        onClick={remove}
        className="size-7 grid place-items-center rounded text-rose-400 hover:bg-rose-50 hover:text-rose-600"
        title="Delete"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
