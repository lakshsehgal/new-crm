import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const Patch = z.object({
  label: z.string().min(1).optional(),
  appliesTo: z
    .array(z.enum(["LEAD", "CONTACT", "OPPORTUNITY"]))
    .min(1)
    .optional(),
  required: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id } = await params;
  const data = Patch.parse(await req.json());
  const field = await db.customField.update({ where: { id }, data });
  return Response.json(field);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id } = await params;
  await db.customField.delete({ where: { id } });
  return Response.json({ ok: true });
}
