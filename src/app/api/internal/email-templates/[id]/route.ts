import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const Patch = z.object({
  name: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireUser();
  const { id } = await params;
  const data = Patch.parse(await req.json());
  const template = await db.emailTemplate.update({ where: { id }, data });
  return Response.json(template);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireUser();
  const { id } = await params;
  await db.emailTemplate.delete({ where: { id } });
  return Response.json({ ok: true });
}
