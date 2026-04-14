import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import UserRoleSelect from "./UserRoleSelect";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await db.user.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div className="p-6 space-y-4">
      <header>
        <h1 className="text-xl font-semibold">Users</h1>
        <p className="text-sm text-muted">Manage roles for workspace members.</p>
      </header>
      <div className="card overflow-hidden">
        <table className="tbl">
          <thead><tr><th>Email</th><th>Name</th><th>Role</th><th>Joined</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.name ?? "—"}</td>
                <td><UserRoleSelect id={u.id} role={u.role} /></td>
                <td className="text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
