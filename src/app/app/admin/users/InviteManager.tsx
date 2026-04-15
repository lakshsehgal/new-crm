"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mail, Copy, Trash2, Plus } from "lucide-react";

type PendingInvite = {
  id: string;
  email: string;
  role: "ADMIN" | "USER";
  expiresAt: string;
  invitedBy: string;
  createdAt: string;
};

export default function InviteManager({
  pending,
}: {
  pending: PendingInvite[];
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "USER">("USER");
  const [busy, setBusy] = useState(false);
  const [freshInvite, setFreshInvite] = useState<{
    email: string;
    inviteUrl: string;
    emailSent: boolean;
  } | null>(null);
  const router = useRouter();

  async function create() {
    if (!email.trim()) return toast.error("Email is required");
    setBusy(true);
    try {
      const res = await fetch("/api/internal/admin/invites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const j = await res.json();
      if (!res.ok && res.status !== 202) {
        toast.error(j.error ?? "Failed to invite");
        return;
      }
      if (res.status === 202) {
        toast.warning(j.warning ?? "Invite created, email failed");
      } else {
        toast.success(`Invite sent to ${j.invite.email}`);
      }
      setFreshInvite({
        email: j.invite.email,
        inviteUrl: j.invite.inviteUrl,
        emailSent: res.status !== 202,
      });
      setEmail("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this invite? The link will stop working.")) return;
    const res = await fetch(`/api/internal/admin/invites/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) return toast.error("Failed to revoke");
    toast.success("Invite revoked");
    router.refresh();
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy — select and copy manually");
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
        Invite teammates
      </h2>

      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            className="input flex-1"
            type="email"
            placeholder="teammate@yourcompany.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void create();
            }}
          />
          <select
            className="input sm:w-36"
            value={role}
            onChange={(e) => setRole(e.target.value as "ADMIN" | "USER")}
          >
            <option value="USER">Member</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button
            className="btn-primary"
            onClick={create}
            disabled={busy || !email.trim()}
          >
            <Plus size={14} /> {busy ? "Sending…" : "Send invite"}
          </button>
        </div>
        <p className="text-[11.5px] text-muted mt-2">
          They&apos;ll receive an email with a one-click link that signs them
          in and grants them the selected role. Link is valid for 7 days.
        </p>

        {freshInvite && (
          <div className="mt-3 rounded-lg border border-accent/30 bg-accentSoft/50 p-3 text-[13px] space-y-1.5">
            <div className="font-semibold text-accent">
              {freshInvite.emailSent
                ? `Invite sent to ${freshInvite.email}`
                : `Invite created for ${freshInvite.email} (email send failed)`}
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 min-w-0 truncate text-[12px] bg-white border border-border rounded px-2 py-1">
                {freshInvite.inviteUrl}
              </code>
              <button
                className="btn"
                onClick={() => copy(freshInvite.inviteUrl)}
              >
                <Copy size={13} /> Copy
              </button>
            </div>
            {!freshInvite.emailSent && (
              <p className="text-[11.5px] text-muted">
                Send this link manually — the email service rejected the
                delivery. Most common cause: the recipient&apos;s domain
                isn&apos;t verified in Resend.
              </p>
            )}
          </div>
        )}
      </div>

      {pending.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[11px] font-semibold text-muted uppercase tracking-wider">
            Pending invites ({pending.length})
          </h3>
          <div className="card overflow-hidden">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Invited by</th>
                  <th>Expires</th>
                  <th className="!w-24"></th>
                </tr>
              </thead>
              <tbody>
                {pending.map((i) => (
                  <tr key={i.id}>
                    <td className="font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <Mail size={13} className="text-muted" />
                        {i.email}
                      </span>
                    </td>
                    <td>
                      <span className="badge">
                        {i.role === "ADMIN" ? "Admin" : "Member"}
                      </span>
                    </td>
                    <td className="text-muted">{i.invitedBy}</td>
                    <td className="text-muted">
                      {new Date(i.expiresAt).toLocaleDateString()}
                    </td>
                    <td className="text-right">
                      <button
                        className="btn-ghost text-rose-600 hover:bg-rose-50"
                        onClick={() => revoke(i.id)}
                        title="Revoke"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
