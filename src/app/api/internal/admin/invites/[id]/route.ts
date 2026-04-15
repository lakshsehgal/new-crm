import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

/** Revoke a pending invite. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id } = await params;
  await db.invite.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
  return Response.json({ ok: true });
}
