import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const Body = z.object({ role: z.enum(["ADMIN", "USER"]) });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id } = await params;
  const { role } = Body.parse(await req.json());
  await db.user.update({ where: { id }, data: { role } });
  return Response.json({ ok: true });
}
