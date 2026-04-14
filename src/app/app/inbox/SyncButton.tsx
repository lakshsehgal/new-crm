"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCcw } from "lucide-react";

export default function SyncButton() {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      className="btn-primary"
      disabled={pending}
      onClick={async () => {
        const res = await fetch("/api/internal/gmail/sync", { method: "POST" });
        if (res.ok) {
          const j = await res.json();
          toast.success(`Synced ${j.count ?? 0} messages`);
          start(() => router.refresh());
        } else toast.error("Sync failed — is Gmail connected?");
      }}
    >
      <RefreshCcw size={14} /> {pending ? "Syncing…" : "Sync inbox"}
    </button>
  );
}
