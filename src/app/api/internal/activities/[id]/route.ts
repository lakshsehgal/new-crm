import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const Patch = z.object({
  title: z.string().optional(),
  body: z.string().nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: z.string().nullable().optional(),
  reminderAt: z.string().datetime().nullable().optional(),
  completed: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireUser();
  const { id } = await params;
  const data = Patch.parse(await req.json());

  const update: Record<string, any> = {};
  if (data.title !== undefined) update.title = data.title;
  if (data.body !== undefined) update.body = data.body;
  if (data.dueAt !== undefined)
    update.dueAt = data.dueAt ? new Date(data.dueAt) : null;
  if (data.completedAt !== undefined)
    update.completedAt = data.completedAt ? new Date(data.completedAt) : null;
  if (data.completed !== undefined)
    update.completedAt = data.completed ? new Date() : null;
  if (data.priority !== undefined) update.priority = data.priority;
  if (data.assigneeId !== undefined) update.assigneeId = data.assigneeId;
  if (data.reminderAt !== undefined)
    update.reminderAt = data.reminderAt ? new Date(data.reminderAt) : null;

  const activity = await db.activity.update({ where: { id }, data: update });
  return Response.json(activity);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireUser();
  const { id } = await params;
  await db.activity.delete({ where: { id } });
  return Response.json({ ok: true });
}
