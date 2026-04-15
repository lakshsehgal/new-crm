import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import UserRoleSelect from "./UserRoleSelect";
import InviteManager from "./InviteManager";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireAdmin();
  const [users, invites] = await Promise.all([
    db.user.findMany({ orderBy: { createdAt: "desc" } }),
    db.invite.findMany({
      where: { acceptedAt: null, revokedAt: null },
      orderBy: { createdAt: "desc" },
      include: { invitedBy: { select: { email: true, name: true } } },
    }),
  ]);

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Users &amp; invites</h1>
        <p className="text-sm text-muted">
          Invite teammates by email, then manage roles once they join.
        </p>
      </header>

      <InviteManager
        pending={invites.map((i) => ({
          id: i.id,
          email: i.email,
          role: i.role,
          expiresAt: i.expiresAt.toISOString(),
          invitedBy: i.invitedBy?.name ?? i.invitedBy?.email ?? "—",
          createdAt: i.createdAt.toISOString(),
        }))}
      />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
          Current members
        </h2>
        <div className="card overflow-hidden">
          <table className="tbl">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Role</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{u.name ?? "—"}</td>
                  <td>
                    <UserRoleSelect id={u.id} role={u.role} />
                  </td>
                  <td className="text-muted">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
