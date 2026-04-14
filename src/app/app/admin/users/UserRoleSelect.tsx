"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function UserRoleSelect({ id, role }: { id: string; role: "ADMIN" | "USER" }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <select
      className="input w-32"
      defaultValue={role}
      disabled={pending}
      onChange={async (e) => {
        const res = await fetch(`/api/internal/admin/users/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ role: e.target.value }),
        });
        if (!res.ok) return toast.error("Failed");
        toast.success("Updated");
        start(() => router.refresh());
      }}
    >
      <option value="USER">User</option>
      <option value="ADMIN">Admin</option>
    </select>
  );
}
