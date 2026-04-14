import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await requireUser();
  const account = await db.account.findFirst({
    where: { userId: user.id, provider: "google" },
    select: { id: true, scope: true, expires_at: true, providerAccountId: true },
  });
  return Response.json({
    connected: !!account,
    scope: account?.scope ?? null,
    expiresAt: account?.expires_at ?? null,
  });
}

export async function DELETE() {
  const user = await requireUser();
  await db.account.deleteMany({ where: { userId: user.id, provider: "google" } });
  await db.gmailSync.deleteMany({ where: { userId: user.id } });
  return Response.json({ ok: true });
}
