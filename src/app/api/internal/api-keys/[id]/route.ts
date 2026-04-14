import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await params;
  await db.apiKey.update({
    where: { id },
    data: { revokedAt: new Date() },
  }).then((k) => {
    if (k.userId !== user.id) throw new Response("Forbidden", { status: 403 });
  });
  return Response.json({ ok: true });
}
