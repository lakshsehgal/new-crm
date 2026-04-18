"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

/**
 * When a lead / opportunity page loads, kick off a background fetch of Gmail
 * history for the linked contacts. Uses sessionStorage so the same lead
 * doesn't re-fetch on every navigation within the session.
 */
export default function LeadEmailAutoSync({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);

  async function sync(force = false) {
    const key = `emailsync:${leadId}`;
    if (!force) {
      try {
        const last = sessionStorage.getItem(key);
        if (last && Date.now() - Number(last) < 5 * 60 * 1000) return;
      } catch {}
    }
    setSyncing(true);
    try {
      const res = await fetch("/api/internal/gmail/sync-lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      if (!res.ok) {
        if (force) toast.error("Email sync failed — is Gmail connected?");
        return;
      }
      const json = await res.json();
      try { sessionStorage.setItem(key, String(Date.now())); } catch {}
      if (force) {
        toast.success(
          json.synced > 0
            ? `Synced ${json.synced} message${json.synced === 1 ? "" : "s"}`
            : "No new messages found",
        );
      }
      router.refresh();
    } finally {
      setSyncing(false);
    }
  }

  // Auto-sync on mount (throttled to once per 5 min per lead)
  useEffect(() => {
    void sync(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  return (
    <button
      className="btn"
      onClick={() => void sync(true)}
      disabled={syncing}
      title="Re-sync emails from Gmail for this lead's contacts"
    >
      <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
      {syncing ? "Syncing…" : "Sync emails"}
    </button>
  );
}
