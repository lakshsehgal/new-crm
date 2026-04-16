import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const Patch = z.object({
  name: z.string().min(1).optional(),
  entity: z.enum(["LEAD", "OPPORTUNITY"]).optional(),
  filters: z
    .object({
      match: z.enum(["all", "any"]),
      conditions: z.array(
        z.object({
          field: z.string(),
          operator: z.string(),
          value: z.any().optional(),
        }),
      ),
    })
    .optional(),
  pinned: z.boolean().optional(),
});

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await params;
  const view = await db.smartView.findFirst({
    where: { id, ownerId: user.id },
  });
  if (!view) return new Response("Not found", { status: 404 });
  return Response.json(view);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await params;
  const data = Patch.parse(await req.json());
  const view = await db.smartView.updateMany({
    where: { id, ownerId: user.id },
    data: data as any,
  });
  if (view.count === 0) return new Response("Not found", { status: 404 });
  const updated = await db.smartView.findUnique({ where: { id } });
  return Response.json(updated);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await params;
  await db.smartView.deleteMany({ where: { id, ownerId: user.id } });
  return Response.json({ ok: true });
}
