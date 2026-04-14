"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function DisconnectButton() {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      className="btn"
      disabled={pending}
      onClick={async () => {
        if (!confirm("Disconnect Gmail? You'll need to reconnect to send or sync email.")) return;
        const res = await fetch("/api/internal/user/gmail-status", { method: "DELETE" });
        if (!res.ok) return toast.error("Failed");
        toast.success("Gmail disconnected");
        start(() => router.refresh());
      }}
    >
      {pending ? "Disconnecting…" : "Disconnect"}
    </button>
  );
}
