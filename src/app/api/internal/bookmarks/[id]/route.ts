import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const Patch = z.object({
  title: z.string().min(1).optional(),
  url: z.string().url().optional(),
  folder: z.string().nullable().optional(),
  order: z.number().int().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await params;
  const data = Patch.parse(await req.json());
  const result = await db.bookmark.updateMany({
    where: { id, ownerId: user.id },
    data,
  });
  if (result.count === 0) return new Response("Not found", { status: 404 });
  const updated = await db.bookmark.findUnique({ where: { id } });
  return Response.json(updated);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await params;
  await db.bookmark.deleteMany({ where: { id, ownerId: user.id } });
  return Response.json({ ok: true });
}
